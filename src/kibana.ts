import { Stack } from '@aws-cdk/core';
import * as ecs from '@aws-cdk/aws-ecs';

const PORT = 5601;

interface KibanaProps {
  cluster: ecs.ICluster;
  elkVersion: string;
}

interface Kibana { kibanaService: ecs.FargateService }

export default function createPomerium(stack: Stack, props: KibanaProps): Kibana {
  const {
    cluster,
    elkVersion,
  } = props;

  const streamPrefix = 'siem-kibana';
  const cpu = '256';
  const memoryMiB = '512';

  const taskDefinition = new ecs.TaskDefinition(stack, 'KibanaTaskDefinition', {
    compatibility: ecs.Compatibility.FARGATE,
    cpu,
    memoryMiB,
  });

  const container = new ecs.ContainerDefinition(stack, 'KibanaContainerDefinition', {
    taskDefinition,
    image: ecs.EcrImage.fromRegistry(`kibana:${elkVersion}`),
    logging: new ecs.AwsLogDriver({
      streamPrefix,
    }),
    environment: {
      ES_JAVA_OPTS: `-Xms256m -Xmx${Number(memoryMiB) / 2}m`,
    },
  });

  container.addPortMappings({
    containerPort: PORT,
    hostPort: PORT,
  });

  const kibanaService = new ecs.FargateService(stack, 'KibanaService', {
    cluster,
    taskDefinition,
    desiredCount: 0,
  });

  return {
    kibanaService,
  };
}
