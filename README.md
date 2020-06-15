# Election Backend

Backend for the 2020 NZ Election Tracking App. Fork of the backend I use for my personal website.

Deploy to GCP like: `gcloud functions deploy election --runtime nodejs10 --trigger-http`

This function requires a `config.json` file set up like this:

```jsonc
{
    "spreadsheetId": "",
    "keys": {
        "incoming": "", // Put your API key here
        "outgoing": { 
            // Put your service account key here
            // type, project id, private key, etc...
        }
    }
}
```
