const { google } = require('googleapis');
const sheets = google.sheets('v4');

exports.election = async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');

    let segments = getSubSegments(req.path.split('/'));

    try {
        switch (req.method) {
            case 'GET':
                switch (segments[0]) {
                    case 'polls':
                        return res.send(await getRows('Polls', 11));

                    case 'electorates':
                        return res.send(await getTabular('Electorates', 8));

                    case 'lists':
                        return res.send(await getColumns('Party Lists', 8));
                }

            case 'POST':
                res.status(405).send({ error: 'That method is not allowed.' });

            case 'OPTIONS':
                res.set('Access-Control-Allow-Methods', 'GET');
                res.set('Access-Control-Allow-Headers', 'Content-Type');
                res.set('Access-Control-Max-Age', '3600');
                return res.status(204).send('');

            default:
                res.status(405).send({ error: 'That method is not allowed.' });
                break;
        }
    }
    catch (e) {
        console.log(e);
        return res.sendStatus(500);
    }
}

/**
 * Get row-formatted data.
 * @param {*} sheet 
 * @param {*} width 
 */
async function getRows(sheet, width) {
    let ranges = [
        `A1:${getColumn(width - 1)}1`,
        `A2:${getColumn(width - 1)}`
    ];
    return await retrieveData(sheet, ranges, 'rows');
}

/**
 * Get column-formatted data.
 * @param {*} sheet 
 * @param {*} numColumns 
 */
async function getColumns(sheet, numColumns) {
    let ranges = [];
    for (let column = 0; column < numColumns; column++) {
        let c = getColumn(column);
        ranges.push(`${c}1:${c}`);
    }
    return await retrieveData(sheet, ranges, 'columns');
}

/**
 * Get tabular-formatted data (both x and y labels).
 * @param {*} sheet 
 * @param {*} width 
 */
async function getTabular(sheet, width) {
    let ranges = [
        `B1:${getColumn(width)}1`,
        `A2:A`,
        `B2:${getColumn(width)}`
    ];
    return await retrieveData(sheet, ranges, 'tabular');
}

/**
 * Look up data from the sheet.
 * @param {string} sheet 
 * @param {Array} ranges 
 * @param {string} lookupType 
 */
async function retrieveData(sheet, ranges, lookupType) {
    let spreadsheetId = getSpreadsheetId();
    let jwt = getJwt();

    const request = {
        spreadsheetId: spreadsheetId,
        ranges: [...ranges.map(range => `${sheet}!${range}`)],
        dateTimeRenderOption: 'SERIAL_NUMBER',
        auth: jwt
    };

    let response = {};
    try {
        response = (await sheets.spreadsheets.values.batchGet(request)).data;
    }
    catch (err) {
        console.error(err);
        if (err.code === 403) {
            throw new Error('The request to the Sheets API failed.');
        }
    }

    switch (lookupType) {
        case 'rows':
            return processRows(response);
        case 'columns':
            return processColumns(response);
        case 'tabular':
            return processTabular(response);
    }
}

/**
 * Process rows of data with headers on the first row.
 * @param {*} response 
 */
function processRows(response) {
    let rows = [];
    let keys = response.valueRanges[0].values[0];
    let values = response.valueRanges[1].values;
    for (let row of values) {
        let obj = {};
        for (let i in keys) {
            obj[keys[i]] = row[i];
        }
        rows.push(obj);
    }

    return {
        rows: rows
    };
}

/**
 * Process column-major data.
 * @param {*} response 
 */
function processColumns(response) {
    let columns = {};
    for (let col in response.valueRanges) {
        let title = response.valueRanges[col].values[0][0];
        let rows = []; 
        
        for (let row of response.valueRanges[col].values) {
            rows.push(row[0]);
        }
        rows.shift();
        
        columns[title] = rows;
    }
    return columns;
}

/**
 * Process data that has headings for each row.
 * @param {*} response 
 */
function processTabular(response) {
    let majorKeys = response.valueRanges[1].values;
    let minorKeys = response.valueRanges[0].values[0];
    let values = response.valueRanges[2].values;

    let out = {};
    
    for (let i in values) {
        let row = values[i];
        let obj = {};

        for (let j in minorKeys) {
            obj[minorKeys[j]] = row[j];
        }

        out[majorKeys[i][0]] = obj;
    }

    return out;
}

function getSubSegments(segments) {
    segments = segments.slice(1, segments.length);
    if (segments[0] === 'election') {
        return segments.slice(1, segments.length);
    }
    return segments;
}

function getSpreadsheetId() {
    return require('./config.json').spreadsheetId;
}

function getJwt() {
    let credentials = require('./config.json').keys.outgoing;
    return new google.auth.JWT(
        credentials.client_email,
        null,
        credentials.private_key,
        ['https://www.googleapis.com/auth/spreadsheets'],
        null
    );
}

function getColumn(c) {
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[c] || 'Z';
}