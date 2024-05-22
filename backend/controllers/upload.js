const fs = require('fs');
const path = require('path');

module.exports = (file) => {
    return new Promise((resolve, reject) => {
        const img = file.data_url;
        // Strip off the data: url prefix to get just the base64-encoded bytes
        const data = img.replace(/^data:image\/\w+;base64,/, "");
        const buf = Buffer.from(data, 'base64');
        const date = new Date();
        const fileName = 'images/' + date.getTime() + '.png';
        const filePath = path.join(__dirname, fileName);

        console.log(fileName);

        fs.writeFile(filePath, buf, (err) => {
            if (err) {
                return reject(err);
            }
            const fileUrl = 'http://localhost:4000/' + fileName;
            resolve(fileUrl);
        });
    });
};
