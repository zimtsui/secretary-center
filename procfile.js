'use strict';

const SecretaryCenter = require('./').default;
const autoExitDecorator
    = require('autonomous/dist/auto-exit-decorator').default;

module.exports = (pandora) => {

    pandora
        .service(
            'secretary-center',
            autoExitDecorator(3000)(SecretaryCenter),
        ).process('process1');

    pandora
        .process('process1')
        .scale(1)
        .env({
            NODE_ENV: pandora.env ? 'development' : 'production',
        });

    /**
     * you can also use cluster mode to start application
     */
    // pandora
    //   .cluster('./.');

    /**
     * you can create another process here
     */
    // pandora
    //   .process('background')
    //   .nodeArgs(['--expose-gc']);

    /**
     * more features please visit our document.
     * https://github.com/midwayjs/pandora/
     */

};