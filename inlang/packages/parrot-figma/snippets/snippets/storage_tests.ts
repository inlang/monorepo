

(function() {
    const start = new Date();
    let checkedKeys = 0;
    for(const key of figma.root.getPluginDataKeys()) {
        const dataRaw = figma.root.getPluginData(key);
        try {

            const dataObject = JSON.parse(dataRaw);
            if (dataObject === 'test') {
                console.log('found');
            }
        } catch (e) {
            console.log(key);
            console.log(dataRaw);
            //throw new Error("key " + key + " data " + dataRaw);
        }
        
        checkedKeys += 1;
    }
    const end = new Date();

    const executionTime = end - start;

    console.log(`Execution time: ${executionTime} milliseconds ${checkedKeys}`);
})()



async function addEntriesToStorage() {
    const entriesPerIteration = 10;
    const iterations = 60;
  
    for (let i = 0; i < iterations; i++) {
      for (let j = 0; j < entriesPerIteration; j++) {
        const currentMillis = Date.now();
        const randomNumber = Math.floor(Math.random() * 1000000);
        const key = `test_${currentMillis}_${randomNumber}`;
        const value = JSON.stringify({ content: 'test', data: 'test2' + randomNumber });
  
        figma.root.setPluginData(key, value);
      }
      console.log('iteration: ' + i);
      await new Promise(resolve => setTimeout(resolve, 1)); // Wait for 1 millisecond
    }
  
    console.log('Entries added successfully!');
  }
  
  // Call the function
  addEntriesToStorage();



  (function() {
    const start = new Date();
    const checkedKeys = 0;
    for(const key of figma.root.getPluginDataKeys()) {
        figma.root.setPluginData(key, '');
    }
    const end = new Date();

    const executionTime = end - start;

    console.log(`Execution time: ${executionTime} milliseconds ${checkedKeys}`);
})()
