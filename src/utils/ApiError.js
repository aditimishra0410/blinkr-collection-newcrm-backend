class ApiError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.message = message;
    this.statusCode = statusCode;
  }
}
export default ApiError;




 /*
 * const apiErrorResp = new ApiError(500, "Internal Server Error");
 * return apiErrorResp;
 * // you will get the following response in Json
 {
     "msg" : "Internal Server Error",
     "statusCode": 500
 }
 * 
 * 
 * 
 */


