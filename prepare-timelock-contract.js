const program = require("commander");
const nunjucks = require("nunjucks");
const fs = require("fs");

program.version("1.0.0");
program.option("-t, --template <template>", "Timelock template", "./contracts/governance/Timelock.template");
program.option("-o, --output <output-file>", "Timelock.sol", "./contracts/governance/Timelock.sol")
program.option("--mock <mock>", "if use mock", false);
program.parse(process.argv);

const data = {mock: program.mock};
const templateContract = fs.readFileSync(program.template).toString();
const generateContract = nunjucks.renderString(templateContract, data);
fs.writeFileSync(program.output, generateContract);
console.log("Succeed to generate Timelock.sol");
