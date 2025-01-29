const fs = require('fs');
async function main() {
    const result = await fetch('https://api.figma.com/v1/files/Tbs7VmbiQk7k72ztMklHub?plugin_data=1205803482754362456&depth=1', {
      headers: {
        'X-Figma-Token': 'replaceWithToken',
      },
    });
    const json = await result.json();
    
    const messagePluginDataPrefix = 'prt_m__';
  
    const rootNodePluginDataEntries = json.document.pluginData['1205803482754362456'];
  
    const extractedMessages = {};
  
    const configKey = 'aar_c';
    const configRaw = rootNodePluginDataEntries[configKey];
    const config = JSON.parse(configRaw);
  
    for (const rootNodePluginDataEntry of Object.keys(rootNodePluginDataEntries)) {
      if (!rootNodePluginDataEntry.startsWith(messagePluginDataPrefix)) {
        continue;
      }
  
      const messageId = rootNodePluginDataEntry.substring(messagePluginDataPrefix.length);
      const messageHeadRaw = rootNodePluginDataEntries[rootNodePluginDataEntry];
  
      if (messageHeadRaw === '') {
        continue;
      }
  
      try {
        extractedMessages[messageId] = JSON.parse(messageHeadRaw);
      } catch (e) {
        console.warn(`Couldnt parse entry for key ${messageId} ${messageHeadRaw}`);
      }
    }
  
    console.log(`${Object.keys(extractedMessages).length} Messages found:`);

    const locales = {};
  
    for (const messageId of Object.keys(extractedMessages)) {
        
      for (const enabledLocale of config.enabledLanguages) {
        if (locales[enabledLocale] === undefined) {
          locales[enabledLocale] = { translation: {} };
        }

        const currentMessage = extractedMessages[messageId];
        const messageName = currentMessage.name;
        
        if (currentMessage.variants[enabledLocale] === undefined) {
          console.warn('No translation of message ' + messageName +' (id:'+messageId+') for Locale ' + enabledLocale + ' found.');
        } else {
          // if (extractedMessages[key].plural) {
            
          //   for (let plural of Object.keys(extractedMessages[key].variants[enabledLocales])) {
          //     locales[enabledLocales].translation[key+ '_' + plural] = extractedMessages[key].variants[enabledLocales][plural].text ?? ''; //.replace('[%i:count]', '{{count}}') ?? '';
          //   }
          // } else {
            locales[enabledLocale].translation[messageName] = extractedMessages[messageId].variants[enabledLocale].n?.other?.text.replace('[%i:count]', '{{count}}') ?? '';
          // }
        }
      }
      
    }

    sortMessagesByPropertyName(locales);

    console.log('const Strings = ' + JSON.stringify(locales, null, 4));

    let translationFileContent = '/* eslint-disable @typescript-eslint/comma-dangle */\n';
    translationFileContent += '/* eslint-disable @typescript-eslint/quotes */\n';
    translationFileContent += '/* eslint-disable quote-props */\n';
    translationFileContent += '/* eslint-disable @typescript-eslint/indent */\n';
    translationFileContent += 'const Strings = ';
    translationFileContent += JSON.stringify(locales, null, 4) + ';';
    translationFileContent += '\n\nexport default Strings;\n'
    fs.writeFileSync("./src/ui/localization/strings.ts", translationFileContent);
    // console.log(json.document.pluginData['1205803482754362456']);
  }

  function sortMessagesByPropertyName(obj) {
    for (const propertyKey of Object.keys(obj)) {
      const objToSortPropertiesOf = obj[propertyKey].translation;
      const sortedObj = {};
      Object.keys(objToSortPropertiesOf).sort().forEach((propName) => {
          sortedObj[propName] = objToSortPropertiesOf[propName];
      });
      obj[propertyKey].translation = sortedObj;
    }
  }
  
  main();
  