'use strict';

// load configuration
var config = require('./config.json');

console.log(config);

// logger
var bunyan = require('bunyan');

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

//*********************************************************************
//* UbiqBot
//*********************************************************************
var UbiqBot = function(){

    var self = this;
    var client = null;

    //*********************************************************************
    //* logonBot
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
    //* addEventListeners
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
    //* logEvent -- helper
    //*********************************************************************
    this.logEvent = function logEvent(evt){
        logger.info('[APP]:', evt.type, 'event received');
        logger.debug('[APP]:', util.inspect(evt, { showHidden: true, depth: null }));
    };

    //*********************************************************************
    //* Retrieve Data from Mentions
    //*********************************************************************
    this.processEvent = function (evt) {
        if ( ! evt.item || ! evt.item.text || ! evt.item.text.content )
           return ;
        if ( evt.item.text.content.includes('span class="mention"') && evt.item.text.content.includes("@"+client.loggedOnUser.displayName) ) {
            logger.info('[APP]:MENTION DETECTED initializing Answer');
            logger.info('[APP]:RETRIEVED CONV ID'+evt.item.convId);
            self.postAnswer("Thanks, have my reply!",evt.item.parentItemId || evt.item.itemId, evt.item.convId);
        }
     }

    //*********************************************************************
    //* Post Reply
    //*********************************************************************
     this.postAnswer = function (text, parentid, conversationID) {
        logger.info('[APP]: postAnswer', text, parentid, conversationID);
        var message = {
            content: text,
            parentId: parentid
            };
            return client.addTextItem(conversationID, message);
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
