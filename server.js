const express = require('express');
const url = require('url');
const https = require('https');
const mongo = require('mongodb').MongoClient;
const path = require('path');

let app = express();

const mongo_url = 'mongodb://' + process.env.USER + ':' + process.env.PASSWD + '@ds147052.mlab.com:47052/fcc-common';

app.use(express.static(path.join(__dirname, 'views')));

app.get('/api/imagesearch/:p', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
  
    let query = 'https://www.googleapis.com/customsearch/v1?searchType=image&num=10&key=' + process.env.KEY 
    + '&cx=' + process.env.CSEID;
    query += '&q=' + req.params.p;

    let offset = url.parse(req.url).query;
    if (offset)
        query += '&start=' + offset.substring(7);

    https.get(query, (r) => { 
        const { statusCode } = r;
        if (statusCode !== 200) {
            console.log("Failed");
            return;
        }
        r.setEncoding('utf-8');
        let data = '';
        r.on('data', (chunk) => {
            data += chunk;
        });
        r.on('end', () => {
            let response = JSON.parse(data).items;
            let send = [];

            response.forEach((val) => {
                let formatted = {};
                formatted.url = val.link;
                formatted.snippet = val.snippet;
                formatted.thumbnail = val.image.thumbnailLink;
                formatted.context = val.image.contextLink;

                send.push(formatted);
            });
            res.end(JSON.stringify(send));
        });
    });
  
    mongo.connect(mongo_url, (err, db) => {
          if (err) throw err;

          let coll = db.collection('imgSearches');
          coll.insert({
              term: req.params.p,
              when: new Date()  
          }, (e, d) => {
              if (e) throw e;
              db.close();
          });
      });
});

app.get('/api/latest/imagesearch', (req, res) => {
    res.writeHead(200, {'Content-Type': 'application/json'});

    mongo.connect(mongo_url, (err, db) => {
        if (err) throw err;

        let coll = db.collection('imgSearches');
        coll.find({}, {
          _id: 0,
          term: 1,
          when: 1
        }).sort({ when: -1 }).limit(10).toArray((e, docs) => {
            res.end(JSON.stringify(docs));

            db.close();
        });
    });
});

app.listen(9000);
