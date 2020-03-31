import {
  Tag, Construct, Stack, StackProps,
} from '@aws-cdk/core';
import { IVpc } from '@aws-cdk/aws-ec2';
import ecs from './ecs';
import elasticsearch from './elasticsearch';

const DEFAULT_ELK_VERSION = '7.6.1';
const DEFAULT_CPU = '512';
const DEFAULT_MEMORY_MIB = '1024';
const DEFAULT_VOLUME_SIZE = 32;

interface Props {
  stackProps: StackProps;
  vpc: IVpc;
  elkVersion?: string;
  cpu?: string;
  memoryMiB?: string;
  desiredCount?: number;
  volumeSize?: number;
  minCapacity?: number;
  maxCapacity?: number;
}

export default function createElkSiem(scope: Construct, props: Props): Stack {
  const { stackProps, vpc } = props;
  const stack = new Stack(scope, 'ElkSiem', stackProps);

  const elkVersion = props.elkVersion || DEFAULT_ELK_VERSION;
  const cpu = props.cpu || DEFAULT_CPU;
  const memoryMiB = props.memoryMiB || DEFAULT_MEMORY_MIB;
  const volumeSize = props.volumeSize || DEFAULT_VOLUME_SIZE;
  const desiredCount = props.desiredCount || 1;
  const minCapacity = props.minCapacity || 1;
  const maxCapacity = props.maxCapacity || 1;
  const mountPath = '/opt/es';

  const { cluster } = ecs(stack, {
    vpc,
    volumeSize,
    minCapacity,
    maxCapacity,
    mountPath,
  });

  elasticsearch(stack, {
    cluster,
    elkVersion,
    cpu,
    memoryMiB,
    mountPath,
    desiredCount,
  });

  Tag.add(stack, 'Workload', 'ELK-SIEM');

  return stack;
}
