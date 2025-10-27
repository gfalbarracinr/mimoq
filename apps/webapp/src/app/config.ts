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
        return {
            apiHostname: 'server',
        };
        
   }
};

const config = getConfig();

export default config;