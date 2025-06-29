import React from "react";
import Icon from "../src/assets/Loginpin.png";
import "./Settings.css";

const Settings = () => {
  return (
    <div className="settings-container">
      <div className="settings-box">
        <ul className="settings-list">
          <li>Edit Profile <span>›</span></li>
          <li>Privacy <span>›</span></li>
          <li>Email settings <span>›</span></li>
          <li>Blocked user <span>›</span></li>
          <li>
          </li>
          <li>What's new <span className="icon"><img src={Icon}/></span></li>
          <li>FAQ <span className="icon"><img src={Icon}/></span></li>
          <li>Terms of Service <span className="icon"><img src={Icon}/></span></li>
          <li>Delete Account <span className="icon"><img src={Icon}/></span></li>
        </ul>

        <button className="add-account">Add Account</button>
        <button className="logout">Logout</button>
      </div>
    </div>
  );
};

export default Settings;
