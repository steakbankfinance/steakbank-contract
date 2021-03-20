const program = require("commander");
const nunjucks = require("nunjucks");
const fs = require("fs");

program.version("1.0.0");
program.option(
    "-t, --template <template>",
    "StakeBNBAgent template file",
    "./contracts/StakeBNBAgent.template"
);
program.option(
    "-o, --output <output-file>",
    "StakeBNBAgent.sol",
    "./contracts/StakeBNBAgent.sol"
)
program.option("--mock <mock>",
    "if use mock",
    false);
program.parse(process.argv);

const data = {mock: program.mock};
const templateString = fs.readFileSync(program.template).toString();
const resultString = nunjucks.renderString(templateString, data);
fs.writeFileSync(program.output, resultString);
console.log("Succeed to generate StakeBNBAgent.sol");
