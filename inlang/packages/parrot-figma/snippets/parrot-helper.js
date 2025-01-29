const PARROT_PLUGIN_ID = "1205803482754362456";
const keyPrefix = 'aar_k__';

module.exports = {
    getText: function (keyName, lang, figmaDocument) {
        const keyRaw = figmaDocument.pluginData[PARROT_PLUGIN_ID][keyPrefix + keyName];

        if (!keyRaw || keyRaw === '') {
            return;
        }

        //(keyRaw)
        const key = JSON.parse(keyRaw);;
        return key.translations[lang]['other'].text;
    },
    getFigmaFile: async function (apiToken, figmaFile) {
        const designFile = await fetch('https://api.figma.com/v1/files/' + figmaFile + '?plugin_data=' + PARROT_PLUGIN_ID + '&depth=1', {
            "headers": {
                "accept": "application/json",
                "accept-language": "de",
                "content-type": "application/json",
                "sec-ch-ua": "\"Not:A-Brand\";v=\"99\", \"Chromium\";v=\"112\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-origin",
                "tsid": "7gyqAGe8aZQX9dif",
                "x-csrf-bypass": "yes",
                "x-figma-user-id": "1175524760316632413",
                "x-figma-user-plan-max": "pro",
                "X-Figma-Token": apiToken,
                "Referer": "https://www.figma.com/",
                "Referrer-Policy": "origin-when-cross-origin"
            },
            //"body": JSON.stringify(body),
            //"method": "POST"
        });
        return (await designFile.json());
    },
};