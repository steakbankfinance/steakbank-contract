const program = require("commander");
const nunjucks = require("nunjucks");
const fs = require("fs");

program.version("1.0.0");
program.option("-t, --template <template>", "Governor template", "./contracts/governance/Governor.template");
program.option("-o, --output <output-file>", "Governor.sol", "./contracts/governance/Governor.sol")
program.option("--mock <mock>", "if use mock", false);
program.parse(process.argv);

const data = {mock: program.mock};
const templateContract = fs.readFileSync(program.template).toString();
const generateContract = nunjucks.renderString(templateContract, data);
fs.writeFileSync(program.output, generateContract);
console.log("Succeed to generate Governor.sol");
