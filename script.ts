import fs from 'fs';
import https from 'https';

const url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Emblem_of_Da_Nang.svg/512px-Emblem_of_Da_Nang.svg.png';
const dest = './public/logo.png';

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  const file = fs.createWriteStream(dest);
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Downloaded logo.png');
  });
}).on('error', (err) => {
  console.error('Error downloading:', err.message);
});
