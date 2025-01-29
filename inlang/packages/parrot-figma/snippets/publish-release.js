const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { getFigmaApiToken, prepareRelease, uploadCodeBundle, publishRelease } = require('./figma-helper.js');
const { getFigmaFile, getText } = require('./parrot-helper.js');

const authNToken = process.env.FIGMA_WEB_AUTHN;
const figmaFile = process.env.FIGMA_TEXT_FILE;
const manifestPath = './manifest.json';
console.log()

const manifest = JSON.parse(fs.readFileSync(path.resolve('./manifest.json'), 'utf8'));

async function runCLI() {
    // Launch a headless browser
    const apiToken = await getFigmaApiToken(authNToken);

    console.log('Got api Token')

    console.log('Fetching Design file ('+figmaFile+') for Plugin Store text...');
    const figmaDocument = (await getFigmaFile(apiToken, figmaFile)).document;
    
    const tags = [];
    for (let i = 0; i < 10; i++) {
        if (getText('plugin_store_tags_tag_' + i, 'en', figmaDocument)) {
            tags.push(getText('plugin_store_tags_tag_' + i, 'en', figmaDocument));
        }
    }
    
    const description = getText('plugin_store_description', 'en', figmaDocument);
    const tagline = getText('plugin_store_tagline', 'en', figmaDocument);
    const name = getText('plugin_store_product_name', 'en', figmaDocument);
    
    console.log('Preparing release...');
    const preparedRelease = await prepareRelease(manifestPath, name, description, tagline, tags, authNToken);
    
    const preparedVersionId = preparedRelease.version_id;
    const signature = preparedRelease.signature;

    console.log('Creating code bundle....');
    const codeUpload = await uploadCodeBundle(manifestPath, preparedRelease.code_upload_url);
    console.log('Uploading code bundle.... done');

    console.log('Releasing prepared version (' + preparedRelease.version_id + ')');
    const publishedVersion = await publishRelease(manifestPath, preparedVersionId, signature, authNToken);
    
    console.log('Version '+ publishedVersion.plugin.versions[preparedVersionId].version +' (' + preparedVersionId + ') published');
  
}

// Run the CLI
runCLI();