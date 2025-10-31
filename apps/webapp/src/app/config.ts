const getConfig = () => {
    const  { hostname } = window.location;
    console.log(hostname);
   switch (hostname) {
    case 'localhost':
        return {
            apiHostname: 'localhost',
        };
    case 'mimoq.local':
        return {
            apiHostname: 'mimoq.local',
        };
    default:
        // production on-premise cluster
        return {
            apiHostname: hostname,
        };
        
   }
};

const config = getConfig();

export default config;