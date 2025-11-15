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
            apiHostname: 'mimoq.local:31321',
        };
    default:
        
        return {
            apiHostname: hostname,
        };
        
   }
};

const config = getConfig();

export default config;