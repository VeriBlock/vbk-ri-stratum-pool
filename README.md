# Reference Implementation of POP-enabled Stratum V1 pool

### To run pool locally:

1. Make sure you use node V13 or lower.
    - use [nvm](https://github.com/nvm-sh/nvm#installation)
    - or [n](https://github.com/tj/n)
2. `git clone https://github.com/VeriBlock/vbk-ri-stratum-pool && cd vbk-ri-stratum-pool`
3. `npx lerna bootstrap` - this will run `lerna bootstrap` command without installation, which is equal to `npm install` in each subpackage. If this fails, open issue in this repo with details.
4. For new coin, create `packages/portal/coins/<name>.json`, for existing coin, skip this step.
5. Create pool config:
    1. Go to `packages/portal/pool_configs`
    2. Copy `litecoin_example.json` and *rename* this file, we will use `vbtc_config.json`
    3. Inside `vbtc_config.json`:
         1. `enabled` - change to `true`
         2. `coin` - set to a filename from `coins` dir, for example `vbtc.json`
         3. Set address (must be legacy) and reward recipients (optional)
         4. In `paymentProcessing` set daemon host, port, and creds.
         5. In `ports` section, each number is a new pool port. For simple deployments, leave single port.
            - if you're not sure what diffs are, set `diff` to 0.01 and remove `varDiff`
         6. `daemons` - define one or multiple (for redundancy) nodes for pool to connect.
         7. `p2p` - defines whether block broadcasting over p2p works or not. Make sure to set correct p2p port.
         8. `mposMode` - in this mode all shares are saved into MySQL instead of Redis. Disable for simple deployments.
6. Create `config.json` in *same folder as init.js*:
   1. Go to `packages/portal`
   2. Copy `config_example.json` and name it `config.json`
   3. Inside `config.json`:
      1. `clustering` - defines number of pool processes to run. For simple deployments use `enabled: false`
      2. `redis` - define host and port of live Redis instance.
      3. `website` - define host, port for website, and also **disable adminCenter**.
      4. `switching` and `profitSwitch` can be skipped for simple deployments.
7. Go to `packages/portal`
8. `node init.js` will run pool daemon and website. Redis and Nodes must be started beforehand.

### To run pool in docker:

Use docker-compose:

```yml
version: '3'
services:
  pool:
    image: veriblock/pop-stratum:latest
    ports:
      # stratum v1 port (defined in poolconfig.json)
      - 3333:3333
      # web (defined in config.json)
      - 8080:8080
    volumes:
      # mount config.json (create manually beforehand)
      - ./config.json:/opt/stratum/packages/portal/config.json:ro
      # mount coin.json (create manually beforehand)
      - ./coin.json:/opt/stratum/packages/portal/coins/coin.json:ro
      # mount poolconfig.json (create manually beforehand)
      - ./poolconfig.json:/opt/stratum/packages/portal/pool_configs/poolconfig.json:ro
    depends_on:
      - redis

  redis:
    image: redis
```


### Test with cpuminer

1. Build https://github.com/pooler/cpuminer
2. `./minerd -o 'stratum+tcp://localhost:3333' -u n4jSe18kZMCdGcZqaYprShXW6EH1wivUK1 -p x -a sha256d`

Where:
- `localhost:3333` is pool's host and port
- `n4jSe18kZMCdGcZqaYprShXW6EH1wivUK1` is a legacy address (can be generated via `vbitcoin-cli getnewaddress "" legacy`)
- `x` is password
- `sha256d` is coin algorithm
