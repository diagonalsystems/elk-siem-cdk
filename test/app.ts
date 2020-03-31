import { App, Stack } from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2';
import createElkSiem from '../src';

const stackProps = {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
  },
};

const app = new App();
const vpcStack = new Stack(app, 'Vpc', stackProps);
const vpc = new Vpc(vpcStack, 'Vpc', {
  maxAzs: 1,
});

createElkSiem(app, {
  stackProps,
  vpc,
  url: 'siem.company.com',
});

app.synth();
