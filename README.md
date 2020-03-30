# elk-siem-cdk

Deploy a SIEM based on the ELK Stack on AWS using the CDK.

## Grocery List

- [x] Restrict access to Kibana (via Pomerium)
- [ ] Schedule Kibana uptime (save $)
- [ ] Ingest logs in Logstash via Kinesis Stream

## Installation

```console
$ npm install --save elk-siem-cdk 
```

## Usage

```js
import { App } from '@aws-cdk/core';
import createElkSiem from 'elk-siem-cdk';

const app = new App();

createElkSiem(app, {

})

app.synth();

```

## Resources

- [AWS Kinesis input plugin for Logstash](https://github.com/logstash-plugins/logstash-input-kinesis)
