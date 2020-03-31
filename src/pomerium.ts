import { Stack } from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import { Secret } from '@aws-cdk/aws-secretsmanager';

interface PomeriumProps {
  cluster: ecs.ICluster;
  url: string;
}

interface Pomerium { pomeriumService: ecs.FargateService }

export default function createPomerium(stack: Stack, props: PomeriumProps): Pomerium {
  const {
    cluster,
    url,
  } = props;

  const streamPrefix = 'siem-pomerium';
  const cpu = '256';
  const memoryMiB = '512';

  const taskDefinition = new ecs.TaskDefinition(stack, 'PomeriumTaskDefinition', {
    cpu,
    memoryMiB,
    compatibility: ecs.Compatibility.FARGATE,
  });

  const idpClientId = new Secret(stack, 'ElkSiem/IdpClientId');
  const idpClientSecret = new Secret(stack, 'ElkSiem/IdpClientSecret');
  const idpServiceAccount = new Secret(stack, 'ElkSiem/IdpServiceAccount');
  const cookieSecret = new Secret(stack, 'ElkSiem/CookieSecret');

  const container = new ecs.ContainerDefinition(stack, 'PomeriumContainerDefinition', {
    taskDefinition,
    memoryReservationMiB: Number(memoryMiB),
    image: ecs.EcrImage.fromRegistry('pomerium/pomerium:latest'),
    logging: new ecs.AwsLogDriver({
      streamPrefix,
    }),
    secrets: {
      IDP_CLIENT_ID: ecs.Secret.fromSecretsManager(idpClientId),
      IDP_CLIENT_SECRET: ecs.Secret.fromSecretsManager(idpClientSecret),
      IDP_SERVICE_ACCOUNT: ecs.Secret.fromSecretsManager(idpServiceAccount),
      COOKIE_SECRET: ecs.Secret.fromSecretsManager(cookieSecret),
    },
    environment: {
      AUTHENTICATE_SERVICE_URL: `https://${url}`,
      IDP_PROVIDER: 'google',
      IDP_PROVIDER_URL: 'https://accounts.google.com',
    },
  });

  const pomeriumService = new ecs.FargateService(stack, 'PomeriumService', {
    cluster,
    taskDefinition,
    desiredCount: 0,
  });

  return {
    pomeriumService,
  };
}
