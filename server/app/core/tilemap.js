'use strict';

var _ = require('lodash')
    , utils = require('../../../shared/utils')
    , Wall = require('../../../shared/core/wall')
    , Body = require('../../../shared/physics/body')
    , List = require('../../../shared/utils/list')
    , EntityFactory = require('./entityFactory')
    , PhysicsComponent = require('../../../shared/components/physics')
    , FlagComponent = require('../components/flag')
    , Tilemap;

/**
 * Tilemap class.
 * @class server.core.Tilemap
 * @classdesc Final class for tilemaps.
 */
Tilemap = utils.inherit(null, {
    /**
     * Creates a new tilemap.
     * @constructor
     * @param {object} data - Tilemap data.
     * @param {object} config - Game configuration.
     */
    constructor: function(data, config) {
        /**
         * @property {string} id - Tilemap identifier.
         */
        this.id = data.id;
        /**
         * @property {string} key - Tilemap key.
         */
        this.key = data.key;
        /**
         * @property {object} data - Tilemap data.
         */
        this.data = data.data;
        /**
         * @property {number} type - Tilemap type.
         */
        this.type = data.type;
        /**
         * @property {number} width - Width of the map in number of tiles.
         */
        this.width = data.data.width;
        /**
         * @property {number} height - Height of the map in number of tiles.
         */
        this.height = data.data.height;
        /**
         * @property {number} tileWidth - Width of each tile in pixels.
         */
        this.tileWidth = data.data.tilewidth;
        /**
         * @property {number} tileHeight - Height of each tile in pixels.
         */
        this.tileHeight = data.data.tileheight;
        /**
         * @property {array} layers - Tilemap layers.
         */
        this.layers = data.layers;
        /**
         * @property {string} collision - Name of the collision layer.
         */
        this.collision = data.collision;
        /**
         * @property {string} flags - Name of the flag layer.
         */
        this.flags = data.flags;
        /**
         * @property {string} image - Tilemap image key.
         */
        this.image = data.image;
        /**
         * @property {string} music - Tilemap music key.
         */
        this.music = data.music;
        /**
         * @property {array} entities - Entities on this map.
         */
        this.entities = data.entities;
        /**
         * @property {object} config - Game configuration.
         */
        this.config = config;

        // internal properties
        this.room = null;
        this._walls = new List();
    }
    /**
     * Initializes the tilemap.
     * @method server.core.Tilemap#init
     */
    , init: function() {
        // loop through the layers to find the collision layer
        _.forOwn(this.data.layers, function(layer) {
            switch (layer.name) {
                case this.collision:
                    this.parseCollisionLayer(layer);
                    break;
                case this.flags:
                    this.parseFlagLayer(layer);
                    break;
                default:
                    break;
            }
        }, this);

        // TODO move entities from the tilemap data to the tilemap itself if possilbe
        // loop through the entities on this map and create them.
        /*
        _.forOwn(this.entities, function(json) {
            entity = EntityFactory.create(json.key);
            attrs = json.attrs || {};

            entity.attrs.set(attrs);

            // TODO use the entity factory to create the entities
            switch (json.key) {
                case 'banner':
                    body = new Body('banner', entity);

                    entity.components.add(new PhysicsComponent(body, this.room.world));
                    entity.components.add(new BannerComponent(this.room));

                    this.room.flagCount++;
                    break;
                default:
                    break;
            }

            this.room.entities.add(entity.id, entity);
        }, this);
        */
    }
    /**
     * TODO
     */
    , parseCollisionLayer: function(layer) {
        var wall, body;

        _.forOwn(layer.objects, function(object) {
            wall = new Wall(object.x, object.y, object.width, object.height);
            body = new Body('wall', wall);
            body.x = wall.x;
            body.y = wall.y;
            body.width = wall.width;
            body.height = wall.height;

            this.room.world.add(body);
            this._walls.add(wall);
        }, this);
        /*
        var x, y, tileX, tileY, tile, body, entity, attrs;

        x = 0;
        y = -1;

        // loop through the layer data and create the necessary tiles
        _.forOwn(layer.data, function(data, index) {
            // make sure that the current position is occupied by a tile
            // (zero stands for empty)
            if (data > 0) {
                tileX = x * this.tileWidth;
                tileY = y * this.tileHeight;
                tile = new Tile(tileX, tileY, this.tileWidth, this.tileHeight);

                body = new Body('tile', tile);
                body.x = tileX;
                body.y = tileY;
                body.width = this.tileWidth;
                body.height = this.tileHeight;

                this.room.world.add(body);

                this._collisionTiles.add(tile);
            }

            if (index % this.width === 0) {
                x = 0;
                y++;
            }
            x++;
        }, this);
        */
    }
    /**
     * TODO
     */
    , parseFlagLayer: function(layer) {
        var entity, body;

        _.forOwn(layer.objects, function(object) {
            entity = EntityFactory.create(object.type);
            entity.attrs.set({x: object.x, y: object.y - 32});

            // TODO use the entity factory to create the entities
            switch (object.type) {
                case 'flag':
                    body = new Body('flag', entity);

                    entity.components.add(new PhysicsComponent(body, this.room.world));
                    entity.components.add(new FlagComponent(this.room));

                    this.room.flagCount++;
                    break;
                default:
                    break;
            }

            this.room.entities.add(entity.id, entity);
        }, this);
    }
    /**
     * Returns the walls on the tilemap.
     * @method server.core.Tilemap#getWalls
     * @return {array} List of walls.
     */
    , getWalls: function() {
        var walls = [];

        this._walls.each(function(wall) {
            walls.push(wall.serialize());
        }, this);

        return walls;
    }
});

module.exports = Tilemap;
