'use strict';

const AWS = require('aws-sdk');
const S3 = new AWS.S3();

const getFolder = (event) => {
  if (event.queryStringParameters && event.queryStringParameters['folder']) {
    return event.queryStringParameters['folder'];
  } else {
    return null;
  }
};

const getLastSegmentOfPath = (path) => {
  const splitPath = path.split('/');
  
  // If the path ends with a '/' get the second to last split value
  if (splitPath[splitPath.length - 1] === '') {
    return splitPath[splitPath.length - 2];
  }

  return splitPath[splitPath.length - 1];
};

const getUpOneLevelQueryParam = (event) => {
  const path = getFolder(event);
  if (!path) {
    return '';
  }

  const splitPath = path.split('/');
  const splitPathWithEndRemoved = splitPath.slice(0, Math.max(0, splitPath.length - 2));
  
  if (splitPathWithEndRemoved.length === 0) {
    return '';
  }
  
  return `?folder=${splitPathWithEndRemoved.join('/')}/`;
};

module.exports.listOutputs = async (event, context) => {
  const params = {
    Bucket: 'election-model-output',
    Delimiter: '/',
    Prefix: getFolder(event)
  };;

  const bucketInfo = await S3.listObjects(params).promise();
  const prefixes = bucketInfo.CommonPrefixes.map((folder) => folder.Prefix);
  const listItems = prefixes.map((prefix) => {
    const gitHubLink = getFolder(event) ? '' : `--- <a href='https://github.com/mdbenjam/election-model/commit/${prefix}'>GitHub Commit</a>`;

    return `<li>
      <a href='${event.requestContext.path}?folder=${prefix}'>${getLastSegmentOfPath(prefix)}</a>
      ${gitHubLink}
    </li>`;
  });
  const folders = listItems.length > 0 ? `<h3>Folders</h3><ul>${listItems.join('')}</ul>` : '';

  const contents = bucketInfo.Contents.map((content) => content.Key);
  const fullKeys = contents.map((key) => `<li><a href='https://d1t1em00wjtgs.cloudfront.net/${key}'>${getLastSegmentOfPath(key)}</a></li>`);
  const outputs = fullKeys.length > 0 ? `<h3>Outputs</h3><ul>${fullKeys.join('')}</ul>` : '';

  const html = `
  <html>
    <body>
      <h3>Current Folder: ${getFolder(event) ? getFolder(event) : '/'}</h3>
      <a href=${event.requestContext.path}${getUpOneLevelQueryParam(event)}>Up one level</a>
      ${folders}
      ${outputs}
    </body>
  </html>`;
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    },
    body: html
  };
};
