const fs = require('fs');

// Function to update the package version
module.exports = {
 updatePackageVersion: function(packageFile, minorVersion) {
    const packageDataRaw = fs.readFileSync(packageFile, 'utf8');
    const packageData = JSON.parse(packageDataRaw);
    const { version } = packageData;
    const versionParts = version.split('.');
    versionParts[versionParts.length - 1] = minorVersion.toString();
    const updatedVersion = versionParts.join('.');
    fs.writeFileSync(packageFile, JSON.stringify({ ...packageData, version: updatedVersion }, null, 2), 'utf8');
}
}

