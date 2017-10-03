'use strict';

// load configuration
var config = require('./config.json');

console.log(config);

// logger
var bunyan = require('bunyan');

//remove Markdown
const removeMd = require('remove-markdown');

// node utils
var util = require('util');

// SDK logger
var sdkLogger = bunyan.createLogger({
    name: 'sdk',
    stream: process.stdout,
    level: config.sdkLogLevel
});

// Application logger
var logger = bunyan.createLogger({
    name: 'app',
    stream: process.stdout,
    level: 'debug'
});

// Circuit SDK
logger.info('[APP]: get Circuit instance');
var Circuit = require('circuit-sdk');

logger.info('[APP]: Circuit set bunyan logger');
Circuit.setLogger(sdkLogger);

// API.AI SDK
logger.info('[APP]: get API.AI instance');
var apiai = require('apiai');



//*********************************************************************
//* UbiqBot
//*********************************************************************
var UbiqBot = function(){

    var self = this;
    var client = null;

    //*********************************************************************
    //* Circuit - logonBot
    //*********************************************************************
    this.logon = function logon(){
        logger.info('[APP]: logon');
        return new Promise( function (resolve, reject) {
            logger.info('[APP]: createClient');
            client = new Circuit.Client({
                client_id: config.client_id,
                client_secret: config.client_secret,
                domain: config.domain,
                autoRenewToken: true
            });
            self.addEventListeners(client);  //register evt listeners
            client.logon()
            .then(function loggedOn(user) {
                logger.info('[APP]: loggedOn', user);
                return client.setPresence({state: Circuit.Enums.PresenceState.AVAILABLE});
            })
            .then(() => {
                console.log('Presence updated');
                resolve();
            })
            .catch(reject);
        });
    };
    
    
    //*********************************************************************
    //* Circuit - addEventListeners
    //*********************************************************************
    this.addEventListeners = function addEventListeners(client){
        logger.info('[APP]: addEventListeners');
        //set event callbacks for this client
        client.addEventListener('connectionStateChanged', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('registrationStateChanged', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('reconnectFailed', function (evt) {
            self.logEvent(evt);
        });
        client.addEventListener('itemAdded', function (evt) {
            self.logEvent(evt);
            self.processEvent(evt)});
        client.addEventListener('itemUpdated', function (evt) {
            self.logEvent(evt);
            self.processEvent(evt)});
    };

           
    //*********************************************************************
    //* Circuit - logEvent -- helper
    //*********************************************************************
    this.logEvent = function logEvent(evt){
        logger.info('[APP]:', evt.type, 'event received');
        logger.debug('[APP]:', util.inspect(evt, { showHidden: true, depth: null }));
    };

    //*********************************************************************
    //* Circuit - Retrieve Data from Mentions
    //*********************************************************************
    this.processEvent = function (evt) {
        if ( ! evt.item || ! evt.item.text || ! evt.item.text.content )
           return ;
        if ( evt.item.text.content.includes('span class="mention"') && evt.item.text.content.includes("@"+client.loggedOnUser.displayName) ) {
            logger.info('[APP]:MENTION DETECTED initializing Answer');
            logger.info('[APP]:RETRIEVED CONV ID :'+evt.item.convId);
            logger.info('[APP]:RETRIEVED TEXT :'+evt.item.text.content);
            logger.info('[APP]:RETRIEVED ItemID :'+evt.item.itemId);                     
            self.postAnswer("Thanks, have my reply for you request",evt.item.parentItemId || evt.item.itemId, evt.item.convId);
            //Additionally send Data API AI
            //self.analyzeData(evt.item.text.content, evt.item.parentItemId || evt.item.itemId);
            self.analyzeData(removeMd(evt.item.text.content), evt.item.parentItemId || evt.item.itemId, evt.item.convId);
        }
     }

    //*********************************************************************
    //* Circuit - Post Reply
    //*********************************************************************
    this.postAnswer = function (text, parentid, conversationID) {
        logger.info('[APP]: postAnswer', text, parentid, conversationID);
        var message = {
            content: text,
            parentId: parentid
            };
        return client.addTextItem(conversationID, message);
    }

    //*********************************************************************
    //* Send Data to API.AI and return result - API.AI
    //*********************************************************************
    this.analyzeData = function (content, sesID, conID) {
        var app = apiai(config.apiai_token);
    
        logger.info('[API AI] REQUEST CONTENT --> '+ content + ' SessionID --> '+ sesID);

        var options = {
            sessionId: sesID
        };
        
        var request = app.textRequest(content, options);
    
        request.on('response', function(response) {
        logger.info('[API AI] RESPONSE: '+ JSON.stringify(response));
        logger.info('[API AI] RESPONSE Object.keys(response): '+ Object.keys(response)); 
        logger.info('[API AI] RESPONSEObject.keys(response.result): '+ (Object.keys(response.result)));        
        logger.info('[API AI] RESPONSE response.result,action: '+ Object.getPrototypeOf(response.result.action));
        logger.info('[API AI] RESPONSE response.result,action: '+ response.result.action);      
        
        
        self.postAnswer('ACTION: '+ response.result.action + '\nMAIL-ADDRESSES: ' + response.result.parameters.email, sesID, conID);

        });
    
        request.on('error', function(error) {
        logger.info('[API AI] ERROR to log: '+ error);
        });
    
        request.end();
    }
}


//*********************************************************************
//* run
//*********************************************************************
function run() {

    var ubiqBot = new UbiqBot();

     ubiqBot.logon()
        .catch (function(e){
            logger.error('[APP]:', e);
        });
}

//******************************************************************
//* main
//*********************************************************************
run();
