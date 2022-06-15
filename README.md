# Reference Implementation of POP-enabled Stratum V1 pool
This is the reference implementation for a PoP ([Proof of Proof](https://wiki.veriblock.org/index.php/PoW_vs_PoP_Mining)) enabled crypto currency. Below you will find the instructions on how to run this implementation via Docker. This stratum has backwards compatibility with coins that do not have PoP mining as well.

## Running a mining pool on Linux

### Setup crypto daemon

Before running our pool, we need to start up the daemon. We will be using the [BTCSQ](https://github.com/VeriBlock/vbk-ri-btc) daemon. There are multiple ways to get the daemon running. You can run this on the same server as the stratum, or on a different machine. In our example, we will be running it on the same machine. Remember, the stratum server will constantly communicate with the daemon to get PoP parameters, block templates, and submit blocks. So, let's get the BTCSQ daemon running! If you want to build the daemon from source, see BTCSQ's documentation [here](https://github.com/VeriBlock/vbk-ri-btc/blob/master/doc/build-unix.md) for Unix build instructions.

Download, unzip and install the latest BTCSQ daemon to your desired location from [here](https://mirror.veriblock.org/BTCSQ-refs.pull.720.merge-0e820a9-linux-x64.zip).

```sh
$ wget https://mirror.veriblock.org/BTCSQ-refs.pull.720.merge-0e820a9-linux-x64.zip
```

After downloading and installing, let's get the daemon configured. Create the config in the default BTCSQ folder.

```sh
$ sudo mkdir -p ~/.btcsq
$ sudo touch ~/.btcsq/btcsq.conf
```

Next, we will need to make sure our daemon is configured properlly. You can use the config below and paste into the `~/.btcsq/btcsq.conf` file above using your favorite editor. Make sure you updae the **username** and **password**. Remember these, you'll need them for the pool configuration later.

```
dnsseed=0
upnp=0
poplogverbosity=info
popaltblocksinmem=10000
popvbkblocksinmem=20000
popbtcblocksinmem=10000
fallbackfee=0.0001

rpcworkqueue=384
server=1
listen=1
rpcallowip=0.0.0.0/0
rpcport=8332
rpcbind=0.0.0.0
rpcuser=username
rpcpassword=password

addnode=95.217.67.117
addnode=95.216.252.203

maxtipage=10000000
checklevel=0
```

### Starting the daemon

After you got the daemon configured properly, let's get the daemon booted and running. Remember, this could take a while, so go get a cup of coffee, go for a run or get dinner ready! We will be booting the coin as a background process. For future reference, you can tail the daemon's logs at `~/.btcsq/debug.log`.

```sh
$ btcsqd -daemon
```

Again, this will start the process in the background. Avoid stopping the daemon using the `kill` command as this could corrpt the wallet, or any blocks that were downloading. This could mean lost tokens as well as the possibility you'll need to re-sync the daemon's blockchain with the network. Tail the logs using the following command:

```sh
$ tail 10 -f ~/.btcsq/debug.log
```

You'll need to wait for the daemon to finish syncing. A good way to deteremine if the daemon has finished syncing is to query the daemon's RPC serer using the cli tool provided. Use the command below to get latest blockchain information. You can also view the explorer to deteremine if the heights are correct.

```sh
$ btcsq-cli getblockchaininfo
```

Next, we'll need a wallet for the pool. Generate a new legacy address for the `pool_configs/poolconfig.json` file.

```sh
$ btcsq-cli getnewaddress "" "legacy"
```

You should get a response with a new wallet legacy wallet address like `14WjhVvbhWbibgQq8uQmhhFEBf5ea3h8Rq`.

### Stopping the daemon

If you need to stop the daemon use the following command.

```sh
$ btcsqd stop
```

### Configuring the pool

There are a couple of parts in the config files you'll need to edit before starting the stratum. First, we need to update the config file. Copy the example in the repository to `config.json`.

```sh
$ cp config_example.json config.json
```

The defaults should be good enough, but feel free to tinker with any settings you wish using your favorite editor. The current config is setup to use the `redis` which is the name of the service in the `docker-compose.yml` file. If you want to run redis seperatly this is where you edit Redis' information.

Next, let's get our pool configured to work with our daemon. Open up the `pool_configs/poolconfig.json` file with your favorite edtior. This file we will need our address that we generated earlier using the **btcsq-cli**. Our address in this example that we generated was `14WjhVvbhWbibgQq8uQmhhFEBf5ea3h8Rq`.

Replace the values of the **address**, and **rewardRecipients** json properties with the address you generated. We will also need to update all the **username** and **password** properties with the respective values you chose for the daemon.

### Running the pool via docker

Included in the repository is a `docker-compose.yml` file which we will use to start up the pool. Edit the `pool_configs/poolconfig.json` file using you favorite editor. The `poolconfig.json` is preconfigured to run the daemon on the host machine using the `docker.host.internal` resolved via docker's internal nameserver resolution. To re-iterate, make sure you update the **user** and **password** to the btcsq daemon's **username** and **password** throughout the file.

Final piece of the puzzle! Let's start the stratum server and the daemon.

```
$ docker-compose up -d
```

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

### Test with cpuminer

1. Build https://github.com/pooler/cpuminer
2. `./minerd -o 'stratum+tcp://localhost:3333' -u n4jSe18kZMCdGcZqaYprShXW6EH1wivUK1 -p x -a sha256d`

Where:
- `localhost:3333` is pool's host and port
- `n4jSe18kZMCdGcZqaYprShXW6EH1wivUK1` is a legacy address (can be generated via `vbitcoin-cli getnewaddress "" legacy`)
- `x` is password
- `sha256d` is coin algorithm
