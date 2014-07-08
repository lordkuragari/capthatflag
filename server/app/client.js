'use strict';

var _ = require('lodash')
    , utils = require('../../shared/utils')
    , shortid = require('shortid')
    , Node = require('../../shared/node')
    , EntityFactory = require('./entityFactory')
    , PlayerComponent = require('./components/player')
    , config = require('./config.json')
    , Client;

/**
 * Client class.
 * @class server.Client
 * @extends shared.Node
 * @property {string} id - Identifier for the client.
 * @property {socketio.Socket} socket - Socket interface for the client.
 * @property {server.Room} room - Room instance that the client is connected to.
 * @property {server.Entity} entity - Associated player entity instance.
 */
Client = utils.inherit(Node, {
    key: 'client'
    , id: null
    , spark: null
    , room: null
    , player: null
    /**
     * Creates a new client.
     * @constructor
     * @param {string} id - Client identifier.
     * @param {primus.Spark} spark - Spark instance.
     * @param {server.Room} room - Room instance.
     */
    , constructor: function(id, spark, room) {
        Node.apply(this);

        this.id = id;
        this.spark = spark;
        this.room = room;

        console.log('  client %s created for room %s', this.id, this.room.id);
    }
    /**
     * Initializes this client.
     * @method server.Client#init
     */
    , init: function() {
        // let the client know to which room they have connected
        this.spark.emit('client.joinRoom', this.room.id);

        console.log('  client %s connected to room %s', this.id, this.room.id);

        // send the configuration to the client
        this.spark.emit('client.init', {
            // client identifier
            id: this.id
            , delay: config.clientDelay
            // game configuration
            , canvasWidth: config.canvasWidth
            , canvasHeight: config.canvasHeight
            , gameWidth: config.gameWidth
            , gameHeight: config.gameHeight
            // map configuration
            , mapKey: this.room.tilemap.key
            , mapData: JSON.stringify(require(this.room.tilemap.data))
            , mapType: this.room.tilemap.type
            , mapImage: this.room.tilemap.image
            , mapSrc: this.room.tilemap.src
            , mapLayer: this.room.tilemap.layers[0]
        });

        // bind event handlers
        this.spark.on('client.ready', this.onReady.bind(this));
        this.spark.on('end', this.onDisconnect.bind(this));
    }
    /**
     * Event handler for when this client is ready.
     * @method server.Client#onReady
     */
    , onReady: function() {
        var player = EntityFactory.create(this.spark, 'player')
            , id = shortid.generate();

        player.attrs.set({
            id: id
            // TODO: add some logic for where to spawn the player
            // spawn the player at a random location for now
            , x: Math.abs(Math.random() * (config.gameWidth - player.attrs.get('width')))
            , y: Math.abs(Math.random() * (config.gameHeight - player.attrs.get('height')))
        });

        player.components.add(new PlayerComponent());

        console.log('   player %s created for client %s', id, this.id);

        this.spark.emit('player.create', player.serialize());

        this.room.entities.add(id, player);

        this.player = player;
    }
    /**
     * Synchronizes this client with the server.
     * @method server.Client#sync
     * @param {object} state - State to synchronize.
     */
    , sync: function(state) {
        this.spark.emit('client.sync', state);
    }
    /**
     * Event handler for when this client disconnects.
     * @method server.Client#onDisconnect
     */
    , onDisconnect: function() {
        var playerId = this.player.attrs.get('id');

        // remove the player
        this.player.die();

        // let other clients know that this client has left the room
        this.room.primus.forEach(function(spark) {
            spark.emit('player.leave', playerId);
        });

        console.log('  client %s disconnected from room %s', this.id, this.room.id);
        this.trigger('client.disconnect', [this.id]);
    }
});

module.exports = Client;
