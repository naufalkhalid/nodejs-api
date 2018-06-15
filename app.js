
var express = require('express');

var cfenv = require('cfenv');

// create a new express server
var app = express();
app.use(require('cors')());
app.use(require('body-parser').json());

var Cloudant = require('cloudant');

var mydb;

/**
 * Endpoint to get a JSON array list of X equipments in database
 * REST API example:
 * <code>
 * GET http://localhost:6001/api/equipment/search?limit={X}
 * </code>
 *
 * Response:
 * [ {'Equipment Number': 1, 'Address': '', 'Contract Start Date': '',
 * 'Contract End Date': '', Status: } ]
 * @return A list of X number of equipments
 */

app.get('/api/equipment/search', (req, res) => {
  let limit = req.query.limit || 10;
  mydb.list({ include_docs: true, limit: limit}, (err, body) => {
    if (err) {
      res.json({Error: err});
    }
    res.json(body.rows.map(row => ({
      equipment_number: row.doc._id,
      address: row.doc.address,
      start_date: row.doc.start_date,
      end_date: row.doc.end_date,
      status: row.doc.status
    })));
  });
});

/**
 * Endpoint to get details for equipment by id
 * REST API example:
 * <code>
 * GET http://localhost:6001/api/equipment/:id
 * </code>
 *
 * Response:
 * {'Equipment Number': 1, 'Address': '', 'Contract Start Date': '',
 * 'Contract End Date': '', Status: }
 * @return An object of equipment details
 */
app.get('/api/equipment/:id', (req, res) => {
  let id = req.params.id || 1;
  mydb.find({ selector: { _id: id }}, (err, body) => {
    if (err) {
      res.json({Error: err});
    }
    res.json(body.docs.map( row =>  ({
      equipment_number: row._id,
      address: row.address,
      start_date: row.start_date,
      end_date: row.end_date,
      status: row.status
    }))[0]);
  });  
});

/**
 * Endpoint to post equipment
 * REST API example:
 * <code>
 * POST http://localhost:6001/api/equipment/
 * </code>
 *
 * Response:
 * {
    "ok": true,
    "id": "0ae0440599979167a42a30c2a50ce524",
    "rev": "1-c03a14df9553d2cc914e78ab1f3a602e"
   } 
 * @return An object of equipment details
 */
app.post('/api/equipment/', (req, res) => {
  if(Object.keys(req.body).length === 0)
  {
    return res.json({Error: 'Request should have a body'});
  }
  // return error if more than one equipment json
  if (Array.isArray(req.body))
  {
    return res.json({Error: 'Request should have one equipment object'});
  }
  data = req.body;
  mydb.find({ selector: { address: data.address, 
    start_date: data.start_date, 
    end_date: data.end_date,
    status: data.status
  }}, (err, body) => {
    if(body.docs.length > 0)
    {
      return res.json({Error: "Record already exists"});
    }
    mydb.insert({ address: data.address, 
      start_date: data.start_date, 
      end_date: data.end_date,
      status: data.status
    }, (err, body) => {
      if (err) {
        res.json({Error: err});
      }
      return res.json(body);
    });  
  });
});


// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

if (!process.env.CLOUDANT_URL) {
  console.error("Please put the URL of your Cloudant instance in an environment variable 'CLOUDANT_URL'");
  process.exit(1);
}

var cloudant = Cloudant({url: process.env.CLOUDANT_URL});

//database name
var dbName = 'testdb';
mydb = cloudant.db.use(dbName);


// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
