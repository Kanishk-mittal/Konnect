### High-Priority Tasks:

1.  **Faculty-Related Code**: The `faculty` user type is partially implemented. It appears in `user.model.ts` and `auth.middleware.ts`, but the corresponding `facultySchema.ts` is not fully integrated. This incomplete feature should either be removed or fully implemented to avoid confusion and potential security risks.
2.  **Missing Error Handling**: The `errorHandler.ts` middleware, as mentioned in the `backend/README.md`, is missing. A centralized error-handling strategy is crucial for the stability and security of the application.
3.  **Empty/Unused Files**: Several files are either empty or contain commented-out code, indicating incomplete features. These include:
    *   `backend/src/controller/api_controller/admin.controller.ts` (contains commented-out legacy code)
    *   `backend/src/controller/api_controller/student.controller.ts` (contains an empty `blockStudent` function)
    *   `frontend/src/api/encryptedRequests.ts`
    *   `frontend/src/pages/OtpVerification.tsx`
    *   `frontend/src/encryption/keyManager.ts`
    *   `frontend/src/utils/authService.ts`
    *   `frontend/src/utils/privateKeyUsageExample.ts`

### Medium-Priority Tasks:

1.  **Redundant Login Pages**: The frontend has separate login pages for `Admin`, `Student`, and `Club`, while the backend uses a unified login controller. Consolidating these into a single, dynamic login page would streamline the user experience and reduce code duplication.
2.  **Incomplete Features**: The `studentRegistrationQueue.ts` and `studentStreamService.ts` files suggest that features for handling bulk student registrations and processing large CSV files are not fully implemented. These should be completed or removed.

### Low-Priority Tasks:

1.  **Testing**: The project lacks a testing suite. Adding unit and integration tests would improve code quality and prevent regressions.
2.  **Code Cleanup**: The codebase contains several `TODO` comments and commented-out code blocks that should be addressed or removed.
