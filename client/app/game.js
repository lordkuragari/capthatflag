define([
    'phaser'
    , 'shared/utils'
    , 'shared/entityHashmap'
    , 'client/entity'
    , 'client/components/actor'
    , 'client/components/input'
], function (Phaser, utils, EntityHashmap, Entity, ActorComponent, InputComponent) {
    'use strict';

    /**
     * Runs the game.
     * @param {Socket} socket - Socket interface.
     * @param {object} config - Game configuration.
     */
    function run(socket, config) {
        console.log('creating client', config);

        /**
         * Gameplay state class.
         * @class client.GameplayState
         * @classdesc Game state that runs the acutal game.
         * @extends Phaser.State
         * @property {dungeon.shared.EntityHashmap} entities - Map over entities in the state.
         */
        var GameplayState = utils.inherit(Phaser.State, {
            entities: null
            /**
             * Creates a new game state.
             * @constructor
             */
            , constructor: function() {
                this.entities = new EntityHashmap();
            }
            /**
             * Loads the game assets.
             * @method client.GameplayState#preload
             * @param {Phaser.Game} game - Game instance.
             */
            , preload: function(game) {
                console.log('loading assets ...');

                game.load.tilemap(config.mapKey, null, config.mapData, config.mapType);
                game.load.image(config.mapImage, 'static/' + config.mapSrc);

                game.load.image('player-male', 'static/assets/images/sprites/player/male.png');
                game.load.image('player-female', 'static/assets/images/sprites/player/female.png');
            }
            /**
             * Creates the game objects.
             * @method client.GameplayState#creeate
             * @param {Phaser.Game} game - Game instance.
             */
            , create: function(game) {
                console.log('creating game ...');

                var map, layer;

                // define the world bounds
                game.world.setBounds(0, 0, config.gameWidth, config.gameHeight);

                // set the background color for the stage
                game.stage.backgroundColor = '#000';

                // start the arcade physics system
                game.physics.startSystem(Phaser.Physics.ARCADE);

                map = game.add.tilemap(config.mapKey);
                map.addTilesetImage(config.mapKey, config.mapImage);
                layer = map.createLayer(config.mapLayer);
                layer.resizeWorld();

                // bind event handlers
                socket.on('player.create', this.onPlayerCreate.bind(this));
                socket.on('player.leave', this.onPlayerLeave.bind(this));

                // let the server know that client is ready
                socket.emit('client.ready');
            }
            /**
             * Event handler for creating the player.
             * @method client.GameplayState#onPlayerCreate
             * @param {object} playerState - Player state.
             */
            , onPlayerCreate: function(playerState) {
                console.log('creating player', playerState);

                var entity = new Entity(socket, playerState)
                    , sprite = this.game.add.sprite(playerState.x, playerState.y, playerState.image)
                    , physics = entity.attrs.get('physics');

                if (physics >= 0) {
                    this.game.physics.enable(sprite, physics);
                    sprite.physicsBodyType = physics;
                    sprite.body.collideWorldBounds = true;
                    sprite.body.immovable = true;
                }

                entity.components.add(new ActorComponent(sprite));
                entity.components.add(new InputComponent(this.game.input));

                this.entities.add(playerState.id, entity);

                // now we are ready to synchronization the world with the server
                socket.on('client.sync', this.onSync.bind(this));
            }
            /**
             * Event handler for synchronizing the client with the server.
             * @method client.GameplayState#onSync
             * @param {object} worldState - World state.
             */
            , onSync: function(worldState) {
                var entityState, entity, sprite, physics;
                for (var i = 0; i < worldState.length; i++) {
                    entityState = worldState[i];
                    entity = this.entities.get(entityState.id);

                    // if the entity does not exist, we need to create it
                    if (!entity) {
                        console.log('creating new entity', entityState);
                        entity = new Entity(socket, entityState);
                        sprite = this.game.add.sprite(entityState.x, entityState.y, entityState.image);
                        physics = entity.attrs.get('physics');

                        if (physics >= 0) {
                            this.game.physics.enable(sprite, physics);
                            sprite.physicsBodyType = physics;
                            sprite.body.collideWorldBounds = true;
                            sprite.body.immovable = true;
                        }

                        entity.components.add(new ActorComponent(sprite));

                        this.entities.add(entityState.id, entity);
                    }

                    // synchronize the state of the entity
                    entity.sync(entityState);
                }
            }
            /**
             * Event handler for when a player leaves.
             * @method client.GameplayState#onPlayerLeave
             * @param {string} id - Player identifier.
             */
            , onPlayerLeave: function (id) {
                console.log('player left', id);

                var player = this.entities.get(id);
                if (player) {
                    player.die();
                }
            }
            /**
             * Updates the logic for this game.
             * @method client.GameplayState#update
             * @param {Phaser.Game} game - Game instance.
             */
            , update: function(game) {
                // todo: add collision detection

                var elapsed = game.time.elapsed;

                this.entities.update(elapsed);
            }
        });

        // create the actual game
        var game = new Phaser.Game(config.canvasWidth, config.canvasHeight, Phaser.AUTO);
        game.state.add('gameplay', new GameplayState(), true/* autostart */);
    }

    return {
        run: run
    };
});