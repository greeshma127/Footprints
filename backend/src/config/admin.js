const DEFAULT_ADMIN_EMAIL="admin@footprints.com";

const getAdminEmail=()=>process.env.ADMIN_EMAIL||DEFAULT_ADMIN_EMAIL;

const isAdminEmail=(email)=>Boolean(email&&email.toLowerCase()===getAdminEmail().toLowerCase());

module.exports={getAdminEmail,isAdminEmail};
