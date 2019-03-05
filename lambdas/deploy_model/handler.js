'use strict';

const AWS = require('aws-sdk');
const ECS = new AWS.ECS();
const crypto = require('crypto');

// Credit to https://github.com/lukehorvat/verify-github-webhook/blob/master/lib/index.js
const validatePayload = (secret, payload, signature) => {
  const computedSignature = `sha1=${crypto.createHmac("sha1", secret).update(payload).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature));
};

module.exports.deployModel = (event, context, callback) => {
  if (!validatePayload(process.env.ELECTION_MODEL_GITHUB_WEBHOOK_SECRET, event.body, event.headers['X-Hub-Signature'])) {
    const response = {
      statusCode: 403,
      headers: {
        'Access-Control-Allow-Origin': '*', // Required for CORS support to work
      },
      body: JSON.stringify({
        message: 'Validation failed'
      }),
    };
    
    callback(null, response);
    return;
  }
  
  // run an ECS Fargate task
  const params = {
    cluster: `default`,
    launchType: 'FARGATE',
    taskDefinition: `election-model:2`,
    count: 1,
    platformVersion:'LATEST',
    networkConfiguration: {
      awsvpcConfiguration: {
          subnets: [
              `subnet-0872220e52c4cfaad`
          ],
          assignPublicIp: 'ENABLED'
      }
    }
  };

  ECS.runTask(params, function (err, data) {
    if (err) {
      console.log(`Error processing ECS Task ${params.taskDefinition}: ${err}`);
    } else {
      console.log(`ECS Task ${params.taskDefinition} started: ${JSON.stringify(data.tasks)}`);
    }
    return;
  });

  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*', // Required for CORS support to work
    },
    body: JSON.stringify({
      message: 'Task started successfully',
      input: event,
    }),
  };

  callback(null, response);
};
