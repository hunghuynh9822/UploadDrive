const express = require('express');
const multer = require('multer');
const ejs = require('ejs');
const path = require('path');

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

//Variable json credentials content
var jsonContent = "";
//Variable json token
var jsonToken = "";

//Set Storage Engine
const storage = multer.diskStorage({
    destination:'./public/upload',
    filename:function(req,file,callback){
        callback(null,path.basename(file.originalname,path.extname(file.originalname))+'-'+Date.now()+path.extname(file.originalname));
    }
});
 
//Init upload
const upload = multer({
    storage:storage,
    limits:{
        fileSize:5242880
    }
    // fileFilter: function(req,file,callback){
    //     checkFileType(file,callback);
    // }
}).single('myImage');

//Check File type
// function checkFileType(file, callback){
//     //Allowed ext
//     const filetypes = /jpeg|jpg|png|gif/;
//     //Check ext
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     //Check mime
//     const mimetype = filetypes.test(file.mimetype);

//     if(mimetype && extname){
//         return callback(null,true);
//     }else{
//         callback('Error: Image Only!');
//     }

// }

//Init app
const app = express();

//EJS
app.set('view engine','ejs');

//Public folder
app.use(express.static('./public'));

app.get('/',(req,res)=> res.render('index'));

app.post('/upload',(req,res)=>{
    upload(req,res,(err)=>{
        if(err){
            res.render('index',{
                msg: err
            });
        }else{
            if(req.file == undefined){
                res.render('index',{
                    msg: 'Error : No file selected'
                });
            }else{
                authorize(jsonContent, uploadFile,req,(err,link)=>{
                    if(err){
                        res.render('index',{
                            msg: err
                        });
                    }else{
                        res.render('index',{
                            msg: 'Uploaded: ',
                            link: link
                        });
                    }
                });
            }
        }
    });
});




// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';


// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  //Save credentials content
  jsonContent = JSON.parse(content);
//   // Authorize a client with credentials, then call the Google Drive API.
//   authorize(JSON.parse(content), uploadFile);
    setupAuthorize(jsonContent)
});
/**
 * 
 * @param {Object} credentials The authorization client credentials.
 */
function setupAuthorize(credentials) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  
    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, (err, token) => {
      if (err) return getAccessToken(oAuth2Client);
    });
  }

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 * @param {Request} req The request send to function
 * @param {function} cb The callback to error of upload
 */
function authorize(credentials, callback,req,cb) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client,req,cb);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client) { //,callback
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
    //   callback(oAuth2Client);
    });
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles(auth) {
  const drive = google.drive({version: 'v3', auth});
  drive.files.list({
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const files = res.data.files;
    if (files.length) {
      console.log('Files:');
      files.map((file) => {
        console.log(`${file.name} (${file.id})`);
      });
    } else {
      console.log('No files found.');
    }
  });
}

//Upload file

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function uploadFile(auth,req,callback){
    const drive = google.drive({version: 'v3', auth});
    var fileMetadata = {
        'name': req.file.filename
      };
      var media = {
        mimeType: 'image/jpeg',
        body: fs.createReadStream(`${req.file.path}`)
      };
      drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id'
      }, function (err, fileDriver) {
        if (err) {
          // Handle error
        //   console.error(err);
          callback(err,null)
        } else {
          console.log('File Id: ', fileDriver.data.id);
          var stringDownload = 'https://drive.google.com/open?id='+fileDriver.data.id;
          callback(err,stringDownload)
        }
      });
}


const port = 3000;

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
