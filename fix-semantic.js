const fs = require('fs');
const path = 'packages/intelligence/src/context/SemanticRetriever.ts';
let content = fs.readFileSync(path, 'utf8');

// Add filter before map
content = content.replace(
  /(\/\/ Score all sections by similarity)\n(\s+const scored: ScoredSection\[\] = sections)\n(\s+)\.map/g,
  '$1 (filter out sections without valid embeddings)\n$2\n$3.filter((s) => s.embedding && s.embedding.buffer && s.embedding.byteLength)\n$3.map'
);

// Change optional chaining to non-null assertions
content = content.replace(/s\.embedding\?\.buffer/g, 's.embedding!.buffer');
content = content.replace(/s\.embedding\?\.byteOffset/g, 's.embedding!.byteOffset');
content = content.replace(/s\.embedding\?\.byteLength/g, 's.embedding!.byteLength');

fs.writeFileSync(path, content);
console.log('Fixed SemanticRetriever.ts');
