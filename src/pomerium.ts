import { Stack } from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import { Secret } from '@aws-cdk/aws-secretsmanager';
import {
  IHostedZone, RecordSet, RecordType, RecordTarget,
} from '@aws-cdk/aws-route53';
import * as route53Targets from '@aws-cdk/aws-route53-targets';
import { IVpc } from '@aws-cdk/aws-ec2';
import {
  ApplicationLoadBalancer, ApplicationListener, ApplicationTargetGroup,
} from '@aws-cdk/aws-elasticloadbalancingv2';
import { DnsValidatedCertificate } from '@aws-cdk/aws-certificatemanager';

const PORT = 443;

interface PomeriumProps {
  cluster: ecs.ICluster;
  vpc: IVpc;
  zone: IHostedZone;
  subdomain?: string;
}

interface Pomerium { pomeriumService: ecs.FargateService }

export default function createPomerium(stack: Stack, props: PomeriumProps): Pomerium {
  const { cluster, vpc, zone } = props;

  const subdomain = props.subdomain || 'siem';
  const domainName = `${subdomain}.${zone.zoneName}`;
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
      AUTHENTICATE_SERVICE_URL: `https://${domainName}`,
      IDP_PROVIDER: 'google',
      IDP_PROVIDER_URL: 'https://accounts.google.com',
    },
  });

  container.addPortMappings({
    containerPort: PORT,
  });

  const pomeriumService = new ecs.FargateService(stack, 'PomeriumService', {
    cluster,
    taskDefinition,
    desiredCount: 0,
  });

  const tls = new DnsValidatedCertificate(stack, 'TlsCert', {
    hostedZone: zone,
    domainName,
  });

  const alb = new ApplicationLoadBalancer(stack, 'Alb', {
    vpc,
    internetFacing: true,
    loadBalancerName: 'ElkSiemAlb',
  });

  const listener = new ApplicationListener(stack, 'AlbListener', {
    loadBalancer: alb,
    port: PORT,
    certificates: [{
      certificateArn: tls.certificateArn,
    }],
  });

  const targetGroup = new ApplicationTargetGroup(stack, 'TargetGroup', {
    vpc,
    port: PORT,
    targets: [pomeriumService],
  });

  listener.addTargetGroups('ElkSiemPomeriumTargetGroups', {
    targetGroups: [targetGroup],
  });

  new RecordSet(stack, 'RecordSet', {
    zone,
    recordType: RecordType.CNAME,
    target: RecordTarget.fromAlias(new route53Targets.LoadBalancerTarget(alb)),
  });

  return {
    pomeriumService,
  };
}
