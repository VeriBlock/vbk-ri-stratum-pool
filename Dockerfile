FROM node:13

WORKDIR /opt/stratum

COPY . .
EXPOSE 8080

RUN npm i -g lerna;\
    lerna clean -y; \
    lerna bootstrap; \
    lerna run build

# /opt/stratum/packages/portal/coins
# /opt/stratum/packages/portal/pool_configs
# /opt/stratum/packages/portal/config.json

WORKDIR /opt/stratum/packages/portal

ENTRYPOINT ["/opt/stratum/entrypoint.sh"]
CMD ["node", "init.js"]
