
# Project assets and resources for figma

MVP 
 - define sharedPluginDataFormat
 - store key / values in one blob in the plugin data
 - implement api to access new format
 - implement figma localization state
 - implement key edit view to allow to create new keys / delete / tag
 - implement script to export strings.dict for ios
 - implement script to export ressources for android
 - make frame feel more native
    - fullscreen
    - modal
    - bottomsheet

# Formatting

Formating while it looks beautifule it can be prety painful to deal with to deal with variants of text.

Topics: 

 - how to translate a string with formating 
    -> mask formats with translator specific makers (check deepl api)
 - how to deal with conflicts between label styles and inline text styles of a key
    -> A key "Hello *world*" empathises the word "world" by formatting it in bold
    -> A label with a label style set to "bold" would overrid the inline style after the key was applied

# Inline Styles

Translations have no key wide style properties. It's not possible to make a whole translation bold for example.
This is because a translation might be used in varios placess with different variants.

It could be that the Text on a Website viewed on desktop should appear bold while on the mobile the text should be 
printed in regular. 

        
    



# Export format 

Keys can be accessed and transformed using sharedPluginData added to figmas root node of a file. 

Information available:

key_name: string
tags: string[]
plurals: ['other', 'zero', ...],
translations: {
    'de': {
        'other': string, // default string always the fallback
        'zero': string, 
        'one': string,
        'two': string,
        'few': string, // not supported for now
        'many': string, // not supported for now
    }
}

# thoughs
User pays per file - one file for free
User pays per colaborator - one 

# investiage:
how does pricing workg 
https://www.figma.com/community/plugin/1169407128424809563


undo forward:
https://forum.figma.com/t/pass-shortcuts-to-figma-when-focused-on-the-plugin-window-and-vice-versa/10229


react optimization
https://tolgee.io/blog/2021/11/24/optimizing-react-to-the-bone

https://lokalise.com/blog/design-stage-localization/


# Label synchronization
 - label has no version - was never synced - no sync needed

 - label has a verion older than one version less than the current - do nothing (manual update needed)
  - 

 - label has a version one version older than the current and the content has not changed - update

# Label state  #1
- no key (untracked)  - (unset)
    Design View
    - [x] option to search for the key 
    - [x] enter a key
        - [x] create key if name is not used yet - version set to the one of the key
        - [ ] handle possible states if key exists
            - [ ] text matches - set version to the one of the key
            - [ ] text differes - prompt user and ask if 
                - [ ] want to use key version in dsign 
                - [ ] create a new key version from design text? 
                - [ ] just link the key 
    
    Key View - on translation updated
    - [x] nothing to do 

- commited/unchanged
    Design View
    - [x] behind - option to update text to the current version
        - [x] ui
        - [x] implementation
    - [ ] no difference - nothing to show

    Key View - on translation updated
    - [ ] behind - show behind in usage state
    - [ ] no differences - update with key 

    
- modified (maybe also behind)
    Design View
    - behind
        - [x] overide with latest version from key
            - [x] ui
            - [x] implementation
        - [x] revert to last version (-> commited/unchanged behind)
            - [x] ui
            - [x] implementation
        - [x] update key - create new key version from design
            - [x] ui
            - [x] implementation
 
    - up to date (pointing to latest key version)
        - [x] revert changes in design
            - [x] ui
            - [x] implementation
        - [x] update key - create new key version from design
            - [x] ui
            - [x] implementation
    
    Key View - on translation updated
    - [ ] behind - show behind in usage state
    - [ ] nothing to do


- Key View - on key name updated
    - [ ] update key in all labels 

# Versioning

The way we comunicate changes over time from the first steps of a welcome message "Hi user" to "Great to have you". A keys value does change correspondinly. To keep track of the different representation a user received keys play a major role. "How did we introduce this feature to the user when we first released it?" "We thought about that text but we decided to drop that idea because of...". 

To answer those questions the extension keeps track of the changes of keys over time. 
It should allow to grasp an overview of states from released version down to individual changes.

To be able to achive this we keep a version counter for each key. Each change of each language/plural will increment this counter and store the new version in the history array at the version position. 

Version 1 (user creates key_1 for de/other):

Key:
key_1 - de - other "Hallo wie gehts?"

versions: 
[
    key_1 - de - other "Hallo wie gehts?",
]


Version 2 (user adds a translation for the language en):
key_1 - de - other "Hallo wie gehts?"
key_1 - en - other "Hello how are you?"


versions: 
[
    de - other "Hallo wie gehts?",
    en - other "Hello how are you?"
]




# Language property

Currently the implementation allows one language per frame. This implementation has following downsides:
- If a lable is moved from the parent frame to another frame (moved or copied) it looses the language information
    - the language of the label would fall back to the base language and its text would most likly differ and show an incorrect change
- If a label is in state changed and a frame changes the language we cant keep the conflicting label

Solution: 

We store the language per label and per frame. When the frame changes it will try to change all label's languages. If a label
is in coflicting state it will not change its language and the ui will have to reflect this and give the user the posibility
to change the language in a later stage. 

Changes:
The point of truth for synchronization is the language of the label

## UI: 
- Frame                              EN

    - Label with changes            EN
    - Label with 1+ behind          EN
    - Label in sync with            CZ
    - Label in sync                 EN
    - Label with no DE translation  EN

Frame language changed to DE

- Frame                             DE 

    - Label with changes            EN (sticks to english because of outstandign changes) open q: when to switch to DE? never / when changes are handled?
    - Label with 1+ behind          DE (save to switch language - so we do it still one behind) 
    - Label in sync with            DE (no need to not sync it back in) 
    - Label in sync                 DE (easy)
    - Label with no DE translation  DE (changes to german but with changed state no revert back but use label)





# Use sample values property
The useSampleValues property was stored on frames first the problem is very similiar to the language problem. 

What we want from ui point of view: 
- The user want to toggle the whole frame 
    - all view should be configured to render or not render sample values

## UI:
 - Frame                                [X] <- click deactivates all
    - Label with sampleValues active    [X]
    - Label with sampleValues active    [X]


 - Frame                                [ ] <- click activates all 
    - Label with sampleValues active    [ ]
    - Label with sampleValues active    [ ]

 - Frame                                [ ] <- click activates all (symbol greyed out to indicate not representative)
    - Label with sampleValues active    [X]
    - Label with sampleValues inactive  [ ]

# Onboarding

- select the base language
- select the languages you want to translate the designfile to
- select the platforms the designs should be used in (ios / android / web / ... ) - this will preconfigure the export eventually
- import existing key file (ios/android)

# Todos: 

 - [x] specify languages for file
 - [x] specfify base language 
 - [x] show baselanguage in localized key always on top 
 - [x] make header columns fixed size based on maximum column content
 - [x] allow the user to resolve the apply conflicts 
 - [x] define language handling per label (if a lable is in state changed a language switch may not work for that label only)
 - [x] allow user to select a key for a label 
    - [x] top down drawer window
    - [x] hide usage 
    - [x] hide multiselect
 - [x] ensure only one open editor - tbd what to do with current active editor with due changes - we save the changes since we have versioning
 - [x] better no keys - empty list messages (no search results / no keys at all) 
 - [x] add revert button to history
 - [x] when checking for behind always use the  frames language instead of the labels one to detect a ne translation that gets added and allow to switch language by updating instance
 - [x] fix order in label screen
 - [x] fix window manager bugs
    - [x] window jumps when viewport is zoomed
    - [x] if zoomfactor is to small sizing glitches
    - [x] propagate viewport height via css variables (https://www.w3schools.com/css/css3_variables_javascript.asp)
 - [x] handle empty text in translation as mising translation '' == undefined
 - [x] fix flicker on zoom

  
 - [x] localize tool using the tool :-) POC
 - [x] Add tooltips 

 - [x] add anotation page
 - [x] allow to save from key translation editor
 - [x] fix selection
 - [x] allow to edit sample data on a label - allow to add default sample data
 - [x] allow to specify the quantity param in the key (first number by default)
 - [x] highlight key of the currently selected label
 - [x] last character bug in key editor
 - [x] add automatic design update for labels with state modified == false && behind == 0 - feedback?
 - [x] filter - match case, need review etc based on figmas search design
 - [x] allow to add a key manually using drawer? Currently one can only create a key form a lable 
 
 - [x] fix translation update from label
    - [x] propagate to other labels after clicking to use figma version
    - [x] labels state is not updated to most recent version
    - [ ] placeholders that have fillins in the label are still shown even if the text doesn't contain the placeholder nor the any translation
    - [ ] show preview when hover 
 - [x] import misses feedback
 - [x] deleting a key gives a crash
 - [x] baselanguage selection does not work in settings screen
 - [x] missing translation filter
 - [x] placeholder not working if at position 0

 TODOS before release
 - [ ] filter not applied if key was updated
 - [x] Title Assets and resources -> parrot
 - [x] Version & Export -> Export
    - [x] remove "Please select the version you want to export"
 - [x] remove versioning
 - [x] remove eye for deactivate translation 
 - [x] deactivate plurals
 - [ ] devmode
    - [ ] remove design, import, settings tab
    - [ ] make keys tab read onnly in dev mode
    - [ ] remvoe window mode button from dev mode

- [x] react select instead of select in settings screen
- [x] dropdown state based on input (only show dropdown on carret click or when something is typed)

 - [x] window handling (sizes in different modes )
 - [x] resize handler
 - [x] right aling select arrow also in non hover state
 - [x] rename placeholders to dynamic content  - reverted ;-)
 - [x] highlight row in key select on hover
 - [x] switching language with placeholder not working atm
    - hint: if placeholder is present in one language only it seems to work
 - [x] remove option to undo changes in design
 - [x] leading linebreak in label - auto removal fix
 - [x] leading spaces 
 - [x] label formating/link vs inline formatting - recognize link on label
    - [x] label formatting not removed from quill but from the renderview?
    - [x] toolbar button not working properly / setting mixin 
 - [x] styling
 - [x] disable placeholder button on selection of multiple placeholders / mixed approach
 
 - [ ] alert once delete key button pressed to confirm action
 - [x] esc for hiding modal views  
 - [x] esc in panel - cancel
 - [x] esc key in drawer and call to action (cancel)
 - [x] enter in create key panel
 - [x] add sentry (see: https://github.com/tokens-studio/figma-plugin/tree/916a34f70d729cb3797a00bcffd78f1790695cb4)
 - [x] add mixpanel (see: https://github.com/tokens-studio/figma-plugin/tree/916a34f70d729cb3797a00bcffd78f1790695cb4)
 
 - [x] add action button to create key when no result in search
 - [ ] provide filter current frame key
 - [ ] command z not working for fillin change
 - [ ] changing a placeholder name in one lable - does not update other labels referencing the same key
 - [x] override label text with translation from key and show toast if text changed
 - [ ] formatting label <-> key
    - [x] placeholder renaming hinders replacement in label
    - [x] placeholder not saved to key on creation
    - [ ] default placeholder not working
        - create a label with a placeholder 
        - create a key based on that label
        - create another label and link it to the key
        - change default placeholder 
        Expexted: the value in the label should be updated
    - [x] changing the placeholder value in the key leads to unsynced label (fillin part of the serialized key) -> remove fillin=\\"*\\" contenteditable=\\"false\\"
 - [x] placeholder not working when inserted before another one
 - [x] click on placeholder should select it
 - [ ] placeholder type and format not implemented
    - [ ] DateTime (Format) - check relative date format etc
    - [ ] Decimal number 
    - [ ] floating number - check format for numbers
    - [ ] currency 
    

 - [x] remove save button from label
 - [x] placeholder not working when no text surrounding it
 - [x] error when deleting the whole label text
 - [x] strikethrough/underline handling
 - [x] unsupported url - only allow relative urls with leading / or http / https / mailto prefix  
 - [x] add feddback on invalid url via notification
 - [ ] search and replace 
 - [x] Change language - auto translate of links - remove link 
 - [ ] how to handle attributes on localized text like class - we cant store them in the element
 - [ ] plural select - based on a quantity value
 - [ ] number based plurals (0 = no new messages, 1 = one new message, other = %n new messages)
 - [ ] check keyname for at least one visible character
 - [ ] polish mouse pointer styles
 - [ ] UX key select
    - [x] search by key "key:keyname or other"
    - [x] show only base language and current frame language
    - [ ] add single line action button "use key"
 - [ ] renaming parameter needs a refactoring - should rename all of them

 - [ ] fix localized label row design
    - [x] do we need to edit or even show the complete text inline in the designs tab?
    - [ ] distinct visual style for base language like bold
 - [ ] translation editor ux - we should be able to hide skipped values from option in toolbar - add hint if it is hidden

 - [ ] delete selection (multi select)
 - [ ] search and replace  
 
 - [ ] variable replacement logic
    - [ ] placeholder style
    

 - [ ] #3 implement fallback mechanism (plural skipped -> other -> other skipped -> base lang plural -> base lang plural skipped -> base lang other ) 
    - [ ] does the label need to know what it falled back to - how can synchonization handle that?

 - [x] key propagation from sandbox (multi user test)
 - [ ] history (who changed what when?) 
 - [ ] allow to rename keys
    - [ ] think about edgecases here 
 - [ ] qa handling of translation

 - [x] use base language for translation if possible
 - [ ] handle selection for keys as well (provide an option to only show keys of current selection)
 - [ ] add show difference toggle to history view

#### TODO's Official release version

- [ ] dev mode 
    - [ ] ** active plugin
        - dev first prototype @Martin
        - design cleanup @Hanna
    - [ ] * inactive plugin (file not configured yet)
        - show what it would look like
        - explain what value it brings 
        - Call to action to run it in design mode
            - playground file!
                - tech details - will it create a copy?, - are plugin data copied as well
                - desing / setup of the file 
- [ ] intro - explain what parrot is
    - [ ] tbd what is part of the first version
- [ ] export secreen
    - [ ] single file export for selected language + platform
- [ ] import
    - [x] summary 

- [ ] add more events to mixed panel
    - [ ] discuss what we need to look at
- [ ] allo to use parrot with textnodes withouth parent 
- [ ] design for minimized view

 Bugs:
 - [x] window resize handle is missing on first start
 - [ ] minimized window position not saved
 
 UX Flaws:
 - [x] meaning of the language picker for a frame not clear
 - [x] choosing frame language in case of unsynced labels not clear
    - "to faar away from the frame title to visually connect it on large screen" - box on hover?
 ~~- [x] meaning of the columns not clear in design tab~~

 - [x] text selection does not lead to something in design view
   - [x] allow to translate labels without frame
   - [X] show clear info why it does nnot work for the selected label
 - [x] the need to select a text node when the plugin is started is not nice
    - [x] select the first visible text node on the screen on first apearance?
    - [ ] keep the last selected frame always visible in the design tab?
   
 - [x] add key suggestion and placeholder to key input
 - [x] key still linked after deletion
 - [x] no confirmation for deletion
 - [x] tooltip for key deletion
 - [x] clear search on key select and hide option when no keys stored or give better feedback
 - [x] add figma to right side bar

 

#### Searching

 When do one want to search?
 Key select modal
 - Matching - when one wants to select a key for a non linked label (separate view)
 Key Tab
 - Missing Translations (filter without search)
 - 

#### Placeholder logic

##### Key Matching
If we have a label with the text "Hello Martin how are you today?" and a key "Hello [[firstname]] how are you today?",
we can match it with a regex like "Hello " ... "how are you today?"

Problems: 
 - the key found does not match exactly
  - "Download App" instead of "Download App" - typo
  - "CO2e" instead of "CO2" - ?
  - "Hi!" instead of "Hi"
  - \n in design but not in key
  - list is not perfect for mapping? - add a mapper screen?
  - 

#### import
 - [ ] import of ios dict
    - files sitting in de.lproj / en.lproj foldern that contain two files
        - [x] *.strings a simple key value fule "key" = "value" while i guess newlines and '"' are encoded somehow
        - [ ] *.stringsdict file containing xml structure for plurals
        - [ ] replace ios placeholders with generalized once
 - [ ] import of android dict
    - android has multiple xml files per language - it separates by folders on drop we can check the folders postfix for the language values-de would be the german strings - we don't know the language for values so
    - [x] files are in xml format so we need to parse it
    - [ ] replace android placeholders with generalized once
 - [x] file import ui
    - drop area for files 
    - import action screen that allows to choose a language and choose the import option
        - ignore new keys (number of keys affected)
        - override existing keys (number of keys affected)
        - ignore existing keys 
        - match by content and add platform specific keys
 - [ ] import from lokalize
 
 #### Plugin Export
 - [x] add export tab with versioning
    - a version will store a figma version - sadly we don't have access to the api from the plugin
        - this means if we want to export from the plugin we need to know the v numebr of each key
    - storing each version of a key will produce a lot of data we could persist the version in the key it self to save the name
    - SOLUTION - we implemented in space consuming version - lets optimize with a lot of data later on

#### API Export
 - [ ] export tool for ios
 - [ ] export tool for android
 - [ ] export tool for react 
 
 - [ ] sample values management tab?
 - [ ] onboarding
 - [ ] pricing overview 
 - [ ] blog

 - [ ] add platforms (ios/android/web/other)
    - [x] ios strings file
    - [ ] ios stingsdict file
    - [x] android xml
 - [ ] allow each key to select plattforms (tags?)
 - [ ] darkmode

 ### After MVP
 - [ ] base default plurals per language on unicodes: https://www.unicode.org/cldr/cldr-aux/charts/29/supplemental/language_plural_rules.html
 - [ ] add tags

Plugins:
https://www.figma.com/community/plugin/864431140615310499/Transifex-Figma-Plugin
https://www.figma.com/community/plugin/818840482503404814/Lokalise
https://www.figma.com/community/plugin/803669834214399971/Phrase-Strings
https://www.figma.com/community/plugin/802555101361690489/Crowdin-for-Figma


Good resources:
https://lokalise.com/blog/translation-keys-naming-and-organizing/?_ga=2.146791028.1532926386.1678634873-760110088.1676107100&_gac=1.254585466.1676366321.CjwKCAiA_6yfBhBNEiwAkmXy5xG_96z9c7XBYCXIcA1BDAndri1psVhtUrW-CoVUqjLWRe6gBMaPLhoCCOIQAvD_BwE

https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes



Plurals:
https://www.unicode.org/reports/tr35/tr35-67/tr35-numbers.html#Language_Plural_Rules
cardinal (default), ordinal 4th...

https://medium.com/@vitaliikuznetsov/plurals-localization-using-stringsdict-in-ios-a910aab8c28c

https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules

(new Intl.PluralRules('en-US')).resolvedOptions().pluralCategories

(new Intl.PluralRules('en-US')).select(0) -> 'other'


AAR'rrr - Piraten maskottchen

An Extension not a Plugin


# TODO'S

Landing page 
Plugin publish
Icon
UI / UX runthrough

Content design
https://www.youtube.com/watch?v=A0yOXuSeX68&ab_channel=Figma
https://www.linkedin.com/in/candiwilliamswriter/


# Marketing 

While everyone here is writing about AI and quantum computers, the small details like proper translations in applications are not solved even at a giant like LinkedIn... The Language extension Parrot for Figma can fix that... pssssst a little bit of AI is hiding here too ;-) 



Find the plugin in Figma now! 

https://www.figma.com/community/plugin/1205803482754362456/Parrot-Beta


Pricing
 Owner 
    - design (link labels)
    - translation review
    - import
    - export
    - team accessmanagement
    - dev mode
      - see linked keys
      - export

 Translator 
   - translation
   - translation review

 Developer
   - dev mode
   - export via api

 Solo performance - Free
    - one owner 
    - 5.000 characters per month
 Small team 
    - one owner
    - one reviewer
    - two developer
 Ultimate 
    - one owner
    - one reviewer
    - two developer


    Arthur Wetzel


# inlang integration: 

 - how to store metadata in parrot - what metadata do i need to store?

 - translation source (ref lang variant) hash 
    - if i don't want to update the source language with every change in the design - which i could for now
 - translation source auto translate 
    - if i don't want to provide the auto translate button next to each (empty message)
    
 - marked as reviewed? 


# Test multyplayer

## Test how the plugindata behaves in offline scenario

### Test how the plugindata behaves in online mode
What happens to a property if it is modified in the same moment by two users

### What happens to a property if it is modified by two users at the same time
// User1: 
() => {
    figma.setPluginData('modify_test_online', 'Created by user1');
    figma.setPluginData('modify_test_online', 'Updated by user1');

    console.log('modify_test_online: ' + figma.getPluginData('modify_test_online'));
    setTimeout(10000, () => console.log('modify_test_online: with delay:' + figma.getPluginData('modify_test_online')));
};
#### User2: 
figma.setPluginData('modify_test_online', 'Updated by user2');
console.log('modify_test_online: ' + figma.getPluginData('modify_test_online'));
setTimeout(10000, () => console.log('modify_test_online: with delay:' + figma.getPluginData('modify_test_online')));

### What happens to a property if it is created by two users at the same time
#### User1: 
figma.setPluginData('create_test_online', 'Created by user1');
console.log('create_test_online: ' + figma.getPluginData('create_test_online'));
setTimeout(10000, () => console.log('create_test_online: with delay:' + figma.getPluginData('create_test_online')))
<<<<<<< HEAD
=======


#### User2: 
figma.setPluginData('create_test_online', 'Created by user2');
console.log('create_test_online: ' + figma.getPluginData('create_test_online'));
setTimeout(10000, () => console.log('create_test_online: with delay:' + figma.getPluginData('create_test_online')))

function runTest(currentUser, testRunPrefix) {

    function schedule(user, taskName, minutes, seconds, millis, func) {
        if (user === currentUser) {
            if (typeof minutes !== 'number') {
                throw new Error('Minutes should be a number.');
            }

            if (minutes <= 0) {
                throw new Error('Minutes should be a positive number.');
            }

            const currentTime = new Date();
            const currentMinutes = currentTime.getMinutes();
            const remainingMinutes = minutes - (currentMinutes % minutes);

            const targetMinutes = currentMinutes + remainingMinutes;
            const targetTime = new Date(
                currentTime.getFullYear(),
                currentTime.getMonth(),
                currentTime.getDate(),
                currentTime.getHours(),
                targetMinutes,
                seconds,
                millis,
            );

            console.log(taskname + ' scheduled for ' + targetTime);

            const timeDifference = targetTime - currentTime;
            setTimeout(func, timeDifference);
        }
        
    }

/*** ---- update at the same time ---- ****/    
    schedule('user1', 'Online Update at same time test:', 1, 0, 0, () => {
        figma.setPluginData(testRunPrefix + 'modify_test_online', 'Created by user1');
        figma.setPluginData(testRunPrefix + 'modify_test_online', 'Updated by user1');

        return 'modify_test_online: ' + figma.getPluginData(testRunPrefix + 'modify_test_online');
    });

    schedule('user2', 'Online Update test at same time:', 1, 0, () => {
        figma.setPluginData(testRunPrefix + 'modify_test_online', 'Updated by user2');
        return 'modify_test_online: ' + figma.getPluginData(testRunPrefix + 'modify_test_online');
    });

    schedule('user2', Online Update test - check:', 1, 20, 0, () => {
        return 'modify_test_online: with delay:' + figma.getPluginData(testRunPrefix + 'modify_test_online'));
    });

    schedule('user1', 'Online Update test - check:', 1, 20, 0, () => {
        return 'modify_test_online: with delay:' + figma.getPluginData(testRunPrefix + 'modify_test_online'));
    });

/*** ---- update by User 1 Earlier ---- ****/
    schedule('user1', 'Online Update User 1 earlier:', 2, 0, 0, () => {
        figma.setPluginData(testRunPrefix + 'modify_user1_first_test_online', 'Updated by user 1');

        return 'modify_user1_first_test_online: ' + figma.getPluginData(testRunPrefix + 'modify_user1_first_test_online');
    });

    schedule('user2', 'Online Update User 1 earlier:', 2, 0, 30, () => {
        figma.setPluginData(testRunPrefix + 'modify_user1_first_test_online', 'Updated by user 2');

        return 'modify_user1_first_test_online: ' + figma.getPluginData(testRunPrefix + 'modify_user1_first_test_online');
    });

    schedule('user1', Online Update test - user 1 earlier check:', 2, 20,0 () 0, => {
        return 'modify_user1_first_test_online: with delay:' + figma.getPluginData(testRunPrefix + 'modify_user1_first_test_online'));
    });

    schedule('user2', Online Update test - user 1 earlier check:', 2, 20,0 () 0, => {
        return 'modify_user1_first_test_online: with delay:' + figma.getPluginData(testRunPrefix + 'modify_user1_first_test_online'));
    });

/***  -------- offline sync check simultanous ------- ****/ 
    schedule('user1', 'Ask user to go offline:', 3, 0, 0 () 0, => {
        return alert('please go offline withinin the next 30 seconds');
    });
     
    schedule('user2', 'Ask user to go offline:', 3, 0, 0 () 0, => {
        return alert('please go offline withinin the next 30 seconds');
    });

    schedule('user1' +' Modifing property offline at the same client time:', 3, 30, 0, () => {
        figma.setPluginData(testRunPrefix + 'modify_user1_first_test_offline', 'Updated by user1');
        return 'modify_test_simultanious_offline: ' + figma.getPluginData(testRunPrefix + 'modify_test_simultanious_offline');
    });

    schedule('user2' +' Modifing property offline at the same client time:', 3, 30, 0, () => {
        figma.setPluginData(testRunPrefix + 'modify_user1_first_test_offline', 'Updated by user2');
        return 'modify_test_simultanious_offline: ' + figma.getPluginData(testRunPrefix + 'modify_test_simultanious_offline');
    });

    schedule('user1', 'Ask user to go online again:', 4, 0, 0 () 0, => {
        return alert('please go online');
    });


    schedule('user2', 'Ask user to go online again:', 4, 30, 0 () 0, => {
        return alert('please go online');
    });


    schedule('user1', 'Offline Update test - simultanious:', 4, 0, 0 () 0, => {
        return 'modify_test_simultanious_offline: with delay:' + figma.getPluginData(testRunPrefix + 'modify_test_simultanious_offline'));
    });


    schedule('user2', 'Offline Update test - simultanious:', 4, 0, 0 () 0, => {
        return 'modify_test_simultanious_offline: with delay:' + figma.getPluginData(testRunPrefix + 'modify_test_simultanious_offline'));
    });

    /***  -------- offline sync checks ------- ****/ 
    schedule('user1', 'Ask user to go online again:', 4, 0, 0 () 0, => {
        return alert('please go online');
    });


    schedule('user2', 'Ask user to go online again:', 4, 30, 0 () 0, => {
        return alert('please go online');
    });

} else {
    schedule('Online Update test at same time:', 1, 0, () => {
        figma.setPluginData('modify_test_online', 'Updated by user2');

        return 'modify_test_online: ' + figma.getPluginData('modify_test_online');
    });
    schedule('Online Update test - check:', 1, 20, () => {
        return 'modify_test_online: with delay:' + figma.getPluginData('modify_test_online'));
    });

    schedule('Online Update User 1 earlier:', 2, 0, 25, () => {
        figma.setPluginData('modify_user1_first_test_online', 'Updated by user2');

        return 'modify_user1_first_test_online: ' + figma.getPluginData('modify_user1_first_test_online');
    });
    schedule('Online Update test - user 1 earlier :', 2, 20, 0() 0, => {
        return 'modify_user1_first_test_online: with delay:' + figma.getPluginData('modify_user1_first_test_online'));
    });
}

}
>>>>>>> production
