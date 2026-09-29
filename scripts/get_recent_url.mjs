import fs from 'fs';

const histPath = 'C:\\Users\\gerec.brewer\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\History';
const buf = fs.readFileSync(histPath);
const str = buf.toString('latin1');
const re = /https:\/\/github\.com\/gerecbrewer1-png\/(realmofcrownsNew|RealmOfCrowns)[^\s"'>]*/gi;
const all = str.match(re) || [];
console.log('Total matches:', all.length);
console.log('Last 10 matches in file order:');
for (const u of all.slice(-10)) {
  console.log(' - ' + u);
}
