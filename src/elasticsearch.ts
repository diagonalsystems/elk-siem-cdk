import { Stack } from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';
import { Secret } from '@aws-cdk/aws-secretsmanager';

interface ElasticSearchProps {
  cluster: ecs.ICluster;
  elkVersion: string;
  cpu: string;
  memoryMiB: string;
  mountPath: string;
  desiredCount: number;
}

export default function createElasticSearch(stack: Stack, props: ElasticSearchProps): Stack {
  const {
    cluster, elkVersion, cpu, memoryMiB, mountPath, desiredCount,
  } = props;

  const streamPrefix = 'siem-elasticsearch';
  const volumeName = 'ElasticSearchData';

  const esTaskDefinition = new ecs.TaskDefinition(stack, 'ElasticSearchTaskDefinition', {
    cpu,
    memoryMiB,
    compatibility: ecs.Compatibility.EC2,
    volumes: [{
      name: volumeName,
      host: {
        sourcePath: mountPath,
      },
    }],
  });

  const esPassword = new Secret(stack, 'EsPassword');
  const containerDefinition = new ecs.ContainerDefinition(stack, 'ContainerDefinition', {
    taskDefinition: esTaskDefinition,
    memoryReservationMiB: Number(memoryMiB),
    image: ecs.EcrImage.fromRegistry(`elasticsearch:${elkVersion}`),
    logging: new ecs.AwsLogDriver({
      streamPrefix,
    }),
    secrets: {
      ELASTIC_PASSWORD: ecs.Secret.fromSecretsManager(esPassword),
    },
    environment: {
      ES_JAVA_OPTS: `-Xms256m -Xmx${Number(memoryMiB) / 2}m`,
      'discovery.type': 'single-node',
    },
  });

  containerDefinition.addMountPoints({
    sourceVolume: volumeName,
    containerPath: '/usr/share/elasticsearch/data',
    readOnly: false,
  });

  new ecs.Ec2Service(stack, 'ElasticSearchService', {
    cluster,
    desiredCount,
    taskDefinition: esTaskDefinition,
  });

  return stack;
}
