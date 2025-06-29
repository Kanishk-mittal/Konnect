<motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="welcome-container"
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="logo"
      >
        K
      </motion.div>
      
      <motion.h1
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="title"
      >
        KONNECT
      </motion.h1>
      
      <motion.p
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="description"
      >
        Connect with your college community. Share knowledge, collaborate, and stay updated with everything happening on campus.
      </motion.p>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="button-container"
      >
        <button
          onClick={() => navigate("/login")}
          className="login-button"
        >
          Login
        </button>
        <button
          onClick={() => navigate("/register")}
          className="register-button"
        >
          Register
        </button>
      </motion.div>
    </motion.div>