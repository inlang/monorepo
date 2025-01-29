const fs = require('fs');
const path = require('path');

function createPluginBundle(sourceContent, htmlContent) {
    let o = (n) => JSON.stringify(n).split(/(<!--|-->|\bimport)/g).map((l, c) => c & 1 ? l.slice(0, 2) + '"+"' + l.slice(2) : l).join("");

    if (typeof htmlContent === 'string') {
        return `const __html__ = ${o(htmlContent)};${sourceContent}`
    }
    return `const __uiFiles__ = {${Object.entries(htmlContent).map(([n, i]) => `[${o(n)}]:${o(i)}`).join(",")}};${sourceContent}`
}


function readJSONFile(filePath) {
    const absoluteFilePath = path.resolve(filePath)
    return new Promise((resolve, reject) => {
        fs.readFile(absoluteFilePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                try {
                    const json = JSON.parse(data);
                    resolve(json);
                } catch (error) {
                    reject(error);
                }
            }
        });
    });
}

module.exports = {
    getFigmaApiToken: async function (authNToken) {
        console.log(authNToken);
        const tokenResponse = await fetch('https://www.figma.com/api/user/dev_tokens', {
            "headers": {
                "content-type": "application/json",
                "cookie": "__Host-figma.authn=" + authNToken, // "figma.session=" + sessionToken +';',
                "Referer": "https://www.figma.com/",
                "Referrer-Policy": "origin-when-cross-origin"
            },
            body: JSON.stringify({
                desc: "ci-generated-token",
                expiration: 240, // 4 minutes 
                scopes: ["files:read"],
            }),
            method: 'POST'
        });

        
        return (await tokenResponse.json()).meta.token;
    },

    getCurrentFigmaPluginVersion: async function (manifestFile, authNToken) {
        const manifest = await readJSONFile(manifestFile);
        const pluginId = manifest.id;
        const pluginsResponse = await fetch("https://www.figma.com/api/plugins", {
            "headers": {
                "content-type": "application/json",
                "cookie": "__Host-figma.authn=" + authNToken, // "figma.session=" + sessionToken +';',
                "Referer": "https://www.figma.com/",
                "Referrer-Policy": "origin-when-cross-origin"
            },
            "method": 'GET'
        });
        let publishRequestJson = await pluginsResponse.json();

        if (publishRequestJson.error) {
            if (publishRequestJson.status === 401) {
                throw new Error('The provided token seem to be no longer valid.');
            }
        }
        const pluginMeta = publishRequestJson.meta.find(plugin => plugin.id === manifest.id);
        
        if (pluginMeta === undefined) {
            throw new Error("The provided autn token does not have access to the plugin with the id " + pluginId);
        }
        const currentVersionId = pluginMeta.current_plugin_version_id;
        // console.log(publishRequestJson.meta.plugin.versions);
        const currentVersionNumber = Number.parseInt(pluginMeta.versions[currentVersionId].version, 10); 
        
        return currentVersionNumber;
    },

    prepareRelease: async function (manifestFile, name, description, tagline, tags, authNToken ) {
        const manifest = await readJSONFile(manifestFile);
        
        const prepareReleaseResponse = await fetch("https://www.figma.com/api/plugins/"+manifest.id+"/upload", {
            "headers": {
                "content-type": "application/json",
                "cookie": "__Host-figma.authn=" + authNToken, // "figma.session=" + sessionToken +';',
                "Referer": "https://www.figma.com/",
                "Referrer-Policy": "origin-when-cross-origin"
            },
            "body": JSON.stringify({
                "manifest": manifest,
                "release_notes": "",
                "name": name,
                "description": description,
                "tagline": tagline,
                "creator_policy": "",
                "tags": tags.map(tag => tag.toLowerCase())
            }),
            method: 'POST'
        });

        const responseJson = await prepareReleaseResponse.json();

        return (responseJson).meta;
    },

    uploadCodeBundle: async function(manifestFile, codeUploadInfo) {
        const manifest = await readJSONFile(manifestFile);

        const main = fs.readFileSync(path.resolve(manifest.main), 'utf8');
        const ui = fs.readFileSync(path.resolve(manifest.ui), 'utf8');
    
        const codeBundle = createPluginBundle(main, ui);
    
        const codeUploadFormData = new FormData();
    
        // add credentials headers for aws upload request 
        Object.entries(codeUploadInfo.fields).forEach(([name, value]) => codeUploadFormData.append(name, value));
        // set content type for the next file parameter to js
        codeUploadFormData.set("Content-Type", "text/javascript");
        // 
        codeUploadFormData.append("file", codeBundle);
        console.log('uploading code bundle');
    
        const codeUploadResponse = await fetch(codeUploadInfo.code_path, codeUploadFormData, {
            raw: !0,
            headers: {
                "Content-Type": "multipart/form-data",
                "Cache-Control": "private, max-age=86400"
            }
        })

    },

    publishRelease: async function(manifestFile, preparedVersionId, signature, authNToken) {
        const manifest = await readJSONFile(manifestFile);

        let publishRequest = await fetch("https://www.figma.com/api/plugins/"+manifest.id+"/versions/" + preparedVersionId, {
            "headers": {
                "content-type": "application/json",
                "cookie": "__Host-figma.authn=" + authNToken, // "figma.session=" + sessionToken +';',
                "Referer": "https://www.figma.com/",
                "Referrer-Policy": "origin-when-cross-origin"
            },
            body: JSON.stringify({
                "agreed_to_tos": true,
                "code_uploade": true,
                "comments_setting": "enabled",
                "cover_image_uploaded": false,
                "icon_uploaded": false,
                "playground_file_publish_type": "noop",
                "signature": signature,
                "snapshot_uploaded": false,
            }),
            "method": 'PUT'
        });
    
        let publishRequestJson = await publishRequest.json();
        return publishRequestJson.meta;
    }
}