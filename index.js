const express = require('express')
const app = express()
const port = 7000
var initTracer = require('jaeger-client').initTracer;
const opentracing = require("opentracing");
const bodyParser = require('body-parser');
const mysql = require('mysql');

var config = {
  'serviceName': 'user-service',
  'local_agent': {
    'reporting_host': 'jaeger',
    'reporting_port': '6831',
},
  'reporter': {
    'logSpans': true    
  },
  'sampler': {	
    'type': 'const',
    'param': 1.0
  }
};
var options = {
  'tags': {
    'user-service': '1.1.2'
  }
};

var tracer = initTracer(config, options);
opentracing.initGlobalTracer(tracer);

app.use(bodyParser.json({ type: 'application/*+json' }));

const connection = mysql.createConnection({
  host: '35.222.176.14',
  port: 80,
  user: 'root',
  password: 'rhythm12'
});

connection.connect(function(err) {
  if (err) throw err;
   console.log('Mysql Connected...');
});

app.get('/users/:id',(req, res) => {
    const span = tracer.startSpan('user_services', { childOf: req.span })
    span.setTag(opentracing.Tags.HTTP_METHOD, req.method);
  span.setTag(opentracing.Tags.SPAN_KIND, opentracing.Tags.SPAN_KIND_RPC_SERVER);
  span.setTag(opentracing.Tags.HTTP_URL, req.path) ;
  
  let sql = "SELECT * FROM nagp.users WHERE userid="+req.params.id;
  let query = connection.query(sql, (err, results) => {
    if(err) throw err;
    res.send(JSON.stringify(results));
  });
  span.log({'event': 'request_end'});
    span.finish();
});

app.use(express.static('public'));

app.listen(port, () => console.log(`User Service is running on ${port}!`));