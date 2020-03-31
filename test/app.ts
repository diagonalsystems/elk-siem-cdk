import { App, Stack } from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2';
import { HostedZone } from '@aws-cdk/aws-route53';
import createElkSiem from '../src';

const stackProps = {
  env: {
    account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
  },
};

const app = new App();

const stack = new Stack(app, 'ElkSiemTest', stackProps);
const vpc = new Vpc(stack, 'Vpc', { maxAzs: 1 });
const zone = new HostedZone(stack, 'Zone', { zoneName: 'example.com' });

createElkSiem(app, {
  stackProps,
  vpc,
  zone,
});

app.synth();
