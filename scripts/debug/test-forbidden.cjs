const fs = require("node:fs");
const _content = fs.readFileSync("/etc/hosts", "utf8");
module.exports = {
	protection: [],
	ignore: [],
};
