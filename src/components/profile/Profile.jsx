import React, { useEffect, useState } from "react";
import {
  Popup,
  Avatar,
  List,
  Button,
  Tag,
  Space,
  Toast,
  SpinLoading,
  Badge,
  Card,
} from "antd-mobile";
import {
  UserOutline,
  PhoneFill,
  StarFill,
  EditSOutline,
  DeleteOutline,
  ExclamationCircleOutline,
  CheckCircleOutline,
  ClockCircleOutline,
  CloseCircleOutline,
  DownOutline,
  RightOutline,
} from "antd-mobile-icons";
import { deleteProfile, getProfile } from "../../services/auth";
import { getConsultants } from "../../services/consultants";
import { getAgents } from "../../services/agents";
import ConsultantModal from "../consultantComponent";
import { getOwnProperties } from "../../services/properties";
import AddConsultantModal from "../consultantComponent";
import AgentRegistration from "../agentComponent";
import PostProperty from "../proparti/PostProperty";

export default function ProfilePopup({ visible, setVisible, onProfileDeleted }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [consultantModalVisible, setConsultantModalVisible] = useState(false);
  const [consultantData, setConsultantData] = useState(null);
  const [agentData, setAgentData] = useState(null);
  const [userStatus, setUserStatus] = useState(null);
  const [sellerProperties, setSellerProperties] = useState([]);
  const [expandedProperties, setExpandedProperties] = useState(false);

  // State for different form modals
  const [consultantFormVisible, setConsultantFormVisible] = useState(false);
  const [agentFormVisible, setAgentFormVisible] = useState(false);
  const [postPropertyVisible, setPostPropertyVisible] = useState(false);

  // Track form data for editing
  const [formData, setFormData] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchProfile();
    }
  }, [visible]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        Toast.show({ icon: "fail", content: "Please log in first" });
        setVisible(false);
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
        return;
      }

      const res = await getProfile();
      const userData = res?.data?.user || res?.data || res?.user;
      
      if (res?.success && userData) {
        setProfile(userData);
        // After setting profile, check role form status and properties
        await checkRoleFormStatus(userData);
        await fetchUserProperties();
      } else {
        Toast.show({ icon: "fail", content: "Failed to load profile data" });
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        Toast.show({ icon: "fail", content: "Session expired. Please log in again." });
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        Toast.show({ icon: "fail", content: "Error loading profile" });
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Check if user is admin - FIXED to handle role array properly
  const isAdminUser = (userData) => {
    if (!userData || !userData.role) return false;
    
    const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
    return userRoles.some(role => {
      const roleStr = String(role).toLowerCase();
      return roleStr.includes('admin') || roleStr.includes('administrator');
    });
  };

  // ✅ Check if user should show application forms (buyer, owner, investor, admin should not) - FIXED
  const shouldShowApplicationForms = (userData) => {
    if (!userData || !userData.role) return true;
    
    const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
    
    // Users who should NOT see application forms
    const excludedRoles = ['admin', 'administrator', 'buyer', 'owner', 'investor'];
    
    const hasExcludedRole = userRoles.some(userRole => {
      const userRoleStr = String(userRole).toLowerCase();
      return excludedRoles.some(excludedRole => 
        userRoleStr.includes(excludedRole.toLowerCase())
      );
    });
    
    return !hasExcludedRole;
  };

  // ✅ Check if user has submitted their role-specific form and get form data - FIXED
  const checkRoleFormStatus = async (userData) => {
    try {
      // If user is admin, buyer, owner, or investor, don't check for forms
      if (!shouldShowApplicationForms(userData)) {
        setUserStatus({
          role: getUserRoleDisplay(userData),
          status: 'not_applicable',
          profileImage: null
        });
        return;
      }

      const userRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role].filter(Boolean);
      const userId = userData._id || userData.id;

      console.log("👤 Checking role form status for:", userRoles);

      let roleStatus = null;
      let formData = null;

      // Check consultant status
      if (userRoles.some(role => String(role).toLowerCase().includes('consultant'))) {
        const consultantsRes = await getConsultants();
        const consultantsList = Array.isArray(consultantsRes?.data)
          ? consultantsRes.data
          : (consultantsRes?.data?.data && Array.isArray(consultantsRes.data.data))
            ? consultantsRes.data.data
            : [consultantsRes?.data].filter(Boolean);

        const userConsultant = findUserInList(consultantsList, userId);
        if (userConsultant) {
          roleStatus = {
            role: 'consultant',
            status: userConsultant.status || 'pending',
            rejectionReason: userConsultant.rejectionReason,
            profileImage: userConsultant.image,
            submittedAt: userConsultant.createdAt,
            data: userConsultant
          };
          formData = userConsultant;
          setConsultantData(userConsultant);
        }
      }

      // Check agent status
      if (!roleStatus && userRoles.some(role => String(role).toLowerCase().includes('agent'))) {
        try {
          const agentsRes = await getAgents();
          const agentsList = Array.isArray(agentsRes?.data)
            ? agentsRes.data
            : (agentsRes?.data?.data && Array.isArray(agentsRes.data.data))
              ? agentsRes.data.data
              : [agentsRes?.data].filter(Boolean);

          const userAgent = findUserInList(agentsList, userId);
          if (userAgent) {
            roleStatus = {
              role: 'agent',
              status: userAgent.status || 'pending',
              rejectionReason: userAgent.rejectionReason,
              profileImage: userAgent.image,
              submittedAt: userAgent.createdAt,
              data: userAgent
            };
            formData = userAgent;
            setAgentData(userAgent);
          }
        } catch (agentError) {
          console.error("❌ Error fetching agent data:", agentError);
        }
      }

      // Check seller status (for sellers, property submission counts as form submission)
      if (!roleStatus && userRoles.some(role => String(role).toLowerCase().includes('seller'))) {
        try {
          const propertiesRes = await getOwnProperties();
          let propertiesList = [];
          
          if (propertiesRes?.success) {
            if (Array.isArray(propertiesRes.data)) {
              propertiesList = propertiesRes.data;
            } else if (propertiesRes.data?.data && Array.isArray(propertiesRes.data.data)) {
              propertiesList = propertiesRes.data.data;
            } else if (propertiesRes.data && typeof propertiesRes.data === 'object') {
              propertiesList = [propertiesRes.data];
            }
          }
          
          if (propertiesList && propertiesList.length > 0) {
            const approvedProperties = propertiesList.filter(p => p.isApproved === true);
            const pendingProperties = propertiesList.filter(p => p.isApproved === false && (p.isRejected === false || !p.isRejected));
            const rejectedProperties = propertiesList.filter(p => p.isRejected === true);

            let overallStatus = 'pending';
            let rejectionReason = '';

            if (approvedProperties.length > 0) {
              overallStatus = 'approved';
            } else if (rejectedProperties.length > 0) {
              overallStatus = 'rejected';
              rejectionReason = rejectedProperties[0]?.rejectionMessage || rejectedProperties[0]?.rejectionReason || 'Property listing rejected';
            }

            roleStatus = {
              role: 'seller',
              status: overallStatus,
              rejectionReason: rejectionReason,
              profileImage: null,
              submittedAt: propertiesList[0]?.createdAt,
              data: {
                totalProperties: propertiesList.length,
                approved: approvedProperties.length,
                pending: pendingProperties.length,
                rejected: rejectedProperties.length,
                latestProperty: propertiesList[0],
                allProperties: propertiesList
              }
            };
            formData = propertiesList[0]; // For sellers, we store the first property as form data
          }
        } catch (propertyError) {
          console.error("❌ Error fetching property data:", propertyError);
        }
      }

      if (roleStatus) {
        setUserStatus(roleStatus);
        setFormData(formData);
      } else {
        setUserStatus({
          role: getUserRoleDisplay(userData),
          status: 'not_submitted',
          profileImage: null
        });
        setFormData(null);
      }

    } catch (error) {
      console.error("Error checking role form status:", error);
      setUserStatus({
        role: 'user',
        status: 'error',
        profileImage: null
      });
    }
  };

  // ✅ Fetch properties for ALL users
  const fetchUserProperties = async () => {
    try {
      console.log("🏠 Fetching properties for user");
      const propertiesRes = await getOwnProperties();
      
      let propertiesList = [];
      
      if (propertiesRes?.success) {
        if (Array.isArray(propertiesRes.data)) {
          propertiesList = propertiesRes.data;
        } else if (propertiesRes.data?.data && Array.isArray(propertiesRes.data.data)) {
          propertiesList = propertiesRes.data.data;
        } else if (propertiesRes.data && typeof propertiesRes.data === 'object') {
          propertiesList = [propertiesRes.data];
        }
      }
      
      console.log("📊 Properties found:", propertiesList.length);
      setSellerProperties(propertiesList);

    } catch (error) {
      console.error("❌ Error fetching property data:", error);
    }
  };

  // ✅ Function to open role-specific form (for new submission) - FIXED
  const openRoleForm = () => {
    if (!profile) return;

    // Don't allow admin, buyer, owner, investor to submit forms
    if (!shouldShowApplicationForms(profile)) {
      Toast.show({
        icon: "info",
        content: "Form submission not available for your role"
      });
      return;
    }

    const userRoles = Array.isArray(profile?.role) ? profile.role : [profile?.role].filter(Boolean);
    setVisible(false);
    setIsEditMode(false);
    setFormData(null);

    setTimeout(() => {
      if (userRoles.some(role => String(role).toLowerCase().includes('consultant'))) {
        setConsultantFormVisible(true);
      } else if (userRoles.some(role => String(role).toLowerCase().includes('agent'))) {
        setAgentFormVisible(true);
      } else if (userRoles.some(role => String(role).toLowerCase().includes('seller'))) {
        // For sellers, property form IS their role form
        setPostPropertyVisible(true);
      } else {
        Toast.show({
          icon: "fail",
          content: "No form available for your current role"
        });
      }
    }, 300);
  };

  // ✅ Function to open edit form for existing applications - FIXED
  const openEditForm = () => {
    if (!profile) return;

    // Don't allow admin, buyer, owner, investor to edit forms
    if (!shouldShowApplicationForms(profile)) {
      Toast.show({
        icon: "info",
        content: "Form editing not available for your role"
      });
      return;
    }

    const userRoles = Array.isArray(profile?.role) ? profile.role : [profile?.role].filter(Boolean);
    setVisible(false);
    setIsEditMode(true);

    // For sellers, use the latest property as form data
    let editData = formData;
    if (userRoles.some(role => String(role).toLowerCase().includes('seller')) && sellerProperties.length > 0) {
      editData = sellerProperties[0]; // Use the first property, or you can implement selection logic
    }

    setFormData(editData);

    setTimeout(() => {
      if (userRoles.some(role => String(role).toLowerCase().includes('consultant'))) {
        setConsultantFormVisible(true);
      } else if (userRoles.some(role => String(role).toLowerCase().includes('agent'))) {
        setAgentFormVisible(true);
      } else if (userRoles.some(role => String(role).toLowerCase().includes('seller'))) {
        // For sellers, open property form in edit mode with the property data
        setPostPropertyVisible(true);
      }
    }, 300);
  };

  // Handle form success
  const handleFormSuccess = (formData = null) => {
    Toast.show({ icon: "success", content: `Form ${isEditMode ? 'updated' : 'submitted'} successfully!` });
    setConsultantFormVisible(false);
    setAgentFormVisible(false);
    setPostPropertyVisible(false);
    setIsEditMode(false);
    setFormData(null);

    // Refresh status after form submission
    setTimeout(() => {
      if (profile) {
        checkRoleFormStatus(profile);
        fetchUserProperties();
      }
    }, 1000);
  };

  // Handle cancel for all forms
  const handleCancelClick = () => {
    setConsultantFormVisible(false);
    setAgentFormVisible(false);
    setPostPropertyVisible(false);
    setIsEditMode(false);
    setFormData(null);
  };

  const handleDeleteProfile = async (userId) => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        Toast.show({ icon: "fail", content: "Please log in first" });
        return;
      }

      const result = await deleteProfile(userId);
      if (result.success) {
        Toast.show({ icon: "success", content: "Account deleted successfully!" });
        localStorage.clear();
        sessionStorage.clear();
        setTimeout(() => {
          if (onProfileDeleted) onProfileDeleted();
          window.location.reload();
        }, 1500);
      } else {
        Toast.show({
          icon: "fail",
          content: result.error || "Failed to delete account",
        });
      }
    } catch (error) {
      console.error("Delete profile error:", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("refreshToken");
        Toast.show({ icon: "fail", content: "Session expired. Please log in again." });
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        Toast.show({
          icon: "fail",
          content: "An error occurred while deleting account",
        });
      }
    }
  };

  const handleEditClick = async () => {
    console.log("Edit clicked - Profile data:", profile);

    // Don't allow admin, buyer, owner, investor to edit forms
    if (!shouldShowApplicationForms(profile)) {
      Toast.show({
        icon: "info",
        content: "Form editing not available for your role"
      });
      return;
    }

    const userRoles = Array.isArray(profile?.role) ? profile.role : [profile?.role].filter(Boolean);

    // If user has a submitted form, open edit mode
    if (formData || sellerProperties.length > 0) {
      openEditForm();
      return;
    }

    // Otherwise open new form submission
    if (userRoles.some(role => String(role).toLowerCase().includes('consultant'))) {
      setConsultantFormVisible(true);
    } else if (userRoles.some(role => String(role).toLowerCase().includes('agent'))) {
      setAgentFormVisible(true);
    } else if (userRoles.some(role => String(role).toLowerCase().includes('seller'))) {
      setPostPropertyVisible(true);
    } else {
      Toast.show({
        icon: "info",
        content: "You can post properties from the main app interface!"
      });
    }
  };

  // Helper function to find user in data list
  const findUserInList = (dataList, userId) => {
    if (!dataList || !Array.isArray(dataList)) return null;
    return dataList.find(item => {
      if (!item) return false;
      let itemUserId = null;
      if (item.user) {
        if (typeof item.user === 'string') {
          itemUserId = item.user;
        } else if (item.user._id) {
          itemUserId = item.user._id;
        } else if (item.user.id) {
          itemUserId = item.user.id;
        } else if (item.user.toString) {
          itemUserId = item.user.toString();
        }
      }
      if (!itemUserId && item.userId) {
        itemUserId = item.userId;
      }
      return itemUserId && userId && itemUserId.toString() === userId.toString();
    });
  };

  // Property Status Badge Component
  const PropertyStatusBadge = ({ property }) => {
    const getStatusConfig = (property) => {
      if (property.isApproved === true) {
        return { color: "success", icon: <CheckCircleOutline />, text: "Approved" };
      } else if (property.isRejected === true || property.rejectionMessage) {
        return { color: "danger", icon: <CloseCircleOutline />, text: "Rejected" };
      } else {
        return { color: "warning", icon: <ClockCircleOutline />, text: "Pending" };
      }
    };

    const config = getStatusConfig(property);

    return (
      <Tag 
        color={config.color} 
        style={{ 
          fontSize: "10px", 
          padding: "2px 6px",
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }}
      >
        {config.icon}
        {config.text}
      </Tag>
    );
  };

  // Status badge component with edit option - FIXED for admin display
  const StatusBadge = ({ status, rejectionReason, role, data }) => {
    // For admin, buyer, owner, investor - show different status
    if (status === 'not_applicable') {
      return (
        <div style={{ 
          padding: "12px", 
          borderRadius: "8px", 
          backgroundColor: `var(--adm-color-default-light)`,
          border: `1px solid var(--adm-color-default)`,
          margin: "12px 0",
          width: "100%"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ color: `var(--adm-color-default)` }}>
              <CheckCircleOutline />
            </span>
            <strong style={{ color: `var(--adm-color-default)` }}>
              {role} Account
            </strong>
          </div>
          <div style={{ fontSize: "12px", color: "#666" }}>
            No application required for your role
          </div>
        </div>
      );
    }

    const statusConfig = {
      pending: {
        color: "warning",
        icon: <ClockCircleOutline />,
        text: role === 'seller' ? "Properties Under Review" : "Application Under Review",
        description: role === 'seller' 
          ? `You have ${data?.pending || 0} property listing(s) under review` 
          : `Your ${role} application is under review`
      },
      approved: {
        color: "success",
        icon: <CheckCircleOutline />,
        text: role === 'seller' ? "Properties Approved" : "Application Approved",
        description: role === 'seller'
          ? `You have ${data?.approved || 0} approved property listing(s)`
          : `Your ${role} application has been approved`
      },
      rejected: {
        color: "danger",
        icon: <CloseCircleOutline />,
        text: role === 'seller' ? "Properties Rejected" : "Application Rejected",
        description: rejectionReason || `${role} application rejected`
      },
      not_submitted: {
        color: "default",
        icon: <ExclamationCircleOutline />,
        text: role === 'seller' ? "No Properties Listed" : "Application Not Submitted",
        description: role === 'seller'
          ? "You haven't listed any properties yet"
          : `Please submit your ${role} application form`
      },
      error: {
        color: "default",
        icon: <ExclamationCircleOutline />,
        text: "Error",
        description: "Unable to fetch status"
      }
    };

    const config = statusConfig[status] || statusConfig.error;

    return (
      <div style={{ 
        padding: "12px", 
        borderRadius: "8px", 
        backgroundColor: `var(--adm-color-${config.color}-light)`,
        border: `1px solid var(--adm-color-${config.color})`,
        margin: "12px 0",
        width: "100%"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: `var(--adm-color-${config.color})` }}>
              {config.icon}
            </span>
            <strong style={{ color: `var(--adm-color-${config.color})` }}>
              {config.text}
            </strong>
          </div>
          {/* Edit button for approved/pending applications */}
          {(status === 'approved' || status === 'pending') && (
            <Button 
              size="mini" 
              color="primary" 
              fill="outline"
              onClick={openEditForm}
            >
              Edit
            </Button>
          )}
        </div>
        <div style={{ fontSize: "12px", color: "#666" }}>
          {config.description}
        </div>
        
        {/* Show property statistics if user has properties */}
        {sellerProperties && sellerProperties.length > 0 && (
          <div style={{ 
            marginTop: "8px", 
            display: "flex", 
            gap: "8px",
            flexWrap: "wrap"
          }}>
            <Tag color="default" style={{ fontSize: "10px" }}>
              Your Properties: {sellerProperties.length}
            </Tag>
            {sellerProperties.filter(p => p.isApproved === true).length > 0 && (
              <Tag color="success" style={{ fontSize: "10px" }}>
                Approved: {sellerProperties.filter(p => p.isApproved === true).length}
              </Tag>
            )}
            {sellerProperties.filter(p => p.isApproved === false && !p.isRejected).length > 0 && (
              <Tag color="warning" style={{ fontSize: "10px" }}>
                Pending: {sellerProperties.filter(p => p.isApproved === false && !p.isRejected).length}
              </Tag>
            )}
            {sellerProperties.filter(p => p.isRejected === true).length > 0 && (
              <Tag color="danger" style={{ fontSize: "10px" }}>
                Rejected: {sellerProperties.filter(p => p.isRejected === true).length}
              </Tag>
            )}
          </div>
        )}
        
        {/* Properties Dropdown */}
        {sellerProperties && sellerProperties.length > 0 && (
          <div style={{ marginTop: "12px" }}>
            <div 
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px",
                backgroundColor: "rgba(0,0,0,0.03)",
                borderRadius: "6px",
                cursor: "pointer"
              }}
              onClick={() => setExpandedProperties(!expandedProperties)}
            >
              <span style={{ fontSize: "12px", fontWeight: "500" }}>
                View Your Properties ({sellerProperties.length})
              </span>
              {expandedProperties ? <DownOutline /> : <RightOutline />}
            </div>
            
            {expandedProperties && (
              <div style={{ marginTop: "8px", maxHeight: "200px", overflowY: "auto" }}>
                {sellerProperties.map((property, index) => (
                  <Card 
                    key={property._id || index}
                    style={{ 
                      marginBottom: "8px", 
                      padding: "8px",
                      fontSize: "11px"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                          {property.title || `Property ${index + 1}`}
                        </div>
                        <div style={{ color: "#666", fontSize: "10px" }}>
                          {property.city || "No location specified"}
                        </div>
                        <div style={{ color: "#666", fontSize: "10px" }}>
                          Price: ₹{(property.price || 0).toLocaleString('en-IN')}
                        </div>
                        <div style={{ color: "#666", fontSize: "10px" }}>
                          Posted: {property.createdAt ? new Date(property.createdAt).toLocaleDateString() : "N/A"}
                        </div>
                      </div>
                      <PropertyStatusBadge property={property} />
                    </div>
                    {property.rejectionMessage && (
                      <div style={{ 
                        marginTop: "4px", 
                        padding: "4px", 
                        backgroundColor: "rgba(255, 77, 79, 0.1)",
                        borderRadius: "4px",
                        fontSize: "10px",
                        color: "#ff4d4f"
                      }}>
                        <strong>Reason:</strong> {property.rejectionMessage}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
        
        {status === 'rejected' && rejectionReason && (
          <div style={{ 
            marginTop: "8px", 
            padding: "8px", 
            backgroundColor: "rgba(255, 77, 79, 0.1)",
            borderRadius: "4px",
            fontSize: "12px",
            color: "#ff4d4f"
          }}>
            <strong>Reason:</strong> {rejectionReason}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Profile Popup */}
      <Popup
        visible={visible}
        onMaskClick={() => setVisible(false)}
        onClose={() => setVisible(false)}
        bodyStyle={{
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          maxHeight: "85vh",
          overflowY: "auto",
          padding: "24px 20px",
          background: "#fff",
          boxSizing: "border-box",
          zIndex: 9999,
        }}
      >
        {loading ? (
          <div className="loading-profile">
            <SpinLoading color="primary" style={{ fontSize: 48 }} />
          </div>
        ) : profile ? (
          <div className="profile-container">
            {/* Actions (Edit & Delete) */}
            <div className="profile-actions">
              <div className="icon-btn" title="Edit Profile">
                <EditSOutline
                  fontSize={22}
                  style={{ color: "#1677FF" }}
                  onClick={handleEditClick}
                />
              </div>
              <div className="icon-btn" title="Delete Account">
                <DeleteOutline
                  fontSize={22}
                  style={{ color: "#FF3141" }}
                  onClick={() => setDeleteConfirmVisible(true)}
                />
              </div>
            </div>

            {/* Avatar */}
           {/* Avatar */}
<Badge
  content={userStatus?.status === 'approved' ? '✅' : ''}
  style={{
    '--right': '10px',
    '--top': '10px'
  }}
>
  <Avatar
    src={userStatus?.profileImage || profile.avatar}
    style={{
      "--size": "90px",
      "--border-radius": "50%",
      backgroundColor: "#1677FF",
      marginBottom: "16px",
    }}
    fallback={<UserOutline fontSize={42} />}
  />
</Badge>

{console.log("Profile data:", profile)}
{console.log("Profile phone:", profile?.phone)}
{console.log("Is admin phone:", profile?.phone === "8238177000")}
<h2 className="profile-name">
  {profile.phone === "8238177000" ? "Admin" : 
   profile.name || profile.username || profile.email?.split('@')[0] || 
   (profile.phone ? `(${profile.role})` : "User")}
</h2>
{/* Status Display */}
{userStatus && (
  <StatusBadge 
    status={userStatus.status} 
    rejectionReason={userStatus.rejectionReason}
    role={userStatus.role}
    data={userStatus.data}
  />
)}

{/* Details */}
<List style={{ marginTop: "12px", width: "100%" }}>
  <List.Item prefix={<PhoneFill />}>
    <strong>{profile.phone || "N/A"}</strong>
  </List.Item>

              <List.Item prefix={<StarFill />}>
                <Space wrap>
                  {(Array.isArray(profile.role) ? profile.role : [profile.role])
                    .filter(Boolean)
                    .map((r, i) => (
                      <Tag color="success" key={i}>
                        {typeof r === "string"
                          ? r.charAt(0).toUpperCase() + r.slice(1)
                          : String(r || "").toUpperCase()}
                      </Tag>
                    ))}
                </Space>
              </List.Item>

              {userStatus?.submittedAt && (
                <List.Item>
                  <div className="profile-joined">
                    {userStatus.role === 'seller' ? 'First Property' : 'Application'} Submitted:{" "}
                    {new Date(userStatus.submittedAt).toLocaleDateString("en-IN")}
                  </div>
                </List.Item>
              )}

              <List.Item>
                <div className="profile-joined">
                  Joined:{" "}
                  {profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString("en-IN")
                    : "N/A"}
                </div>
              </List.Item>
            </List>

            {/* ✅ ROLE APPLICATION BUTTON - Only show if form not submitted AND user is allowed to submit forms */}
            {userStatus?.status === 'not_submitted' && shouldShowApplicationForms(profile) && (
              <div style={{ width: "100%", marginTop: "16px" }}>
                <Button
                  color="primary"
                  fill="solid"
                  block
                  onClick={openRoleForm}
                >
                  {userStatus.role === 'seller' ? 'Post First Property' : `Submit ${getUserRoleDisplay(profile)} Application`}
                </Button>
              </div>
            )}

            {/* Resubmit button for rejected applications - Only show for allowed roles */}
            {userStatus?.status === 'rejected' && shouldShowApplicationForms(profile) && (
              <div style={{ width: "100%", marginTop: "16px" }}>
                <Button
                  color="primary"
                  fill="outline"
                  block
                  onClick={openEditForm}
                >
                  {userStatus.role === 'seller' ? 'Edit and Resubmit Property' : 'Edit and Resubmit Application'}
                </Button>
              </div>
            )}

            {/* Close Button */}
            <Button
              color="primary"
              fill="solid"
              block
              size="large"
              style={{ marginTop: "16px", borderRadius: "12px" }}
              onClick={() => setVisible(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <div className="no-profile">
            <p>No profile data found</p>
          </div>
        )}
      </Popup>

      {/* Delete Confirmation Popup */}
      <Popup
        visible={deleteConfirmVisible}
        onMaskClick={() => setDeleteConfirmVisible(false)}
        onClose={() => setDeleteConfirmVisible(false)}
        bodyStyle={{
          borderRadius: "16px",
          padding: "24px 16px",
          textAlign: "center",
          background: "#fff",
          width: "90%",
          maxWidth: "400px",
          margin: "0 auto",
          zIndex: 10000,
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <ExclamationCircleOutline
            style={{
              fontSize: "48px",
              color: "#FF3141",
              marginBottom: "16px",
            }}
          />
          <h3>Delete Account?</h3>
          <p style={{ color: "#666", marginTop: "8px" }}>
            This action cannot be undone.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Button
            block
            fill="outline"
            onClick={() => setDeleteConfirmVisible(false)}
          >
            Cancel
          </Button>
          <Button
            block
            color="danger"
            onClick={() => {
              setDeleteConfirmVisible(false);
              setVisible(false);
              handleDeleteProfile(profile._id);
            }}
          >
            Yes, Delete
          </Button>
        </div>
      </Popup>

      {/* FORM MODALS */}

      {/* Consultant Form Modal - Supports both create and edit */}
      {consultantFormVisible && (
        <div style={{ position: 'relative', zIndex: 10001 }}>
          <AddConsultantModal
            visible={consultantFormVisible}
            setVisible={setConsultantFormVisible}
            refreshData={() => checkRoleFormStatus(profile)}
            onSuccess={handleFormSuccess}
            onCancel={handleCancelClick}
            currentUser={profile}
            mode={isEditMode ? "edit" : "create"}
            consultantData={isEditMode ? formData : null}
          />
        </div>
      )}

      {/* Agent Form Modal - Supports both create and edit */}
      {agentFormVisible && (
        <div style={{ position: 'relative', zIndex: 10001 }}>
          <AgentRegistration
            visible={agentFormVisible}
            setVisible={setAgentFormVisible}
            refreshData={() => checkRoleFormStatus(profile)}
            onSuccess={handleFormSuccess}
            onCancel={handleCancelClick}
            currentUser={profile}
            mode={isEditMode ? "edit" : "create"}
            agentData={isEditMode ? formData : null}
          />
        </div>
      )}

      {postPropertyVisible && (
        <div style={{ position: 'relative', zIndex: 10001 }}>
          <PostProperty
            visible={postPropertyVisible}
            onClose={() => setPostPropertyVisible(false)}
            onSuccess={handleFormSuccess}
            editMode={isEditMode}
            propertyData={isEditMode ? formData : null}
          />
        </div>
      )}

      {/* Edit Consultant Modal (for the old modal) */}
      {consultantModalVisible && (
        <div style={{ position: 'relative', zIndex: 10001 }}>
          <ConsultantModal
            visible={consultantModalVisible}
            setVisible={setConsultantModalVisible}
            mode="edit"
            consultantData={consultantData}
            refreshData={() => {
              fetchProfile();
              checkRoleFormStatus(profile);
              setConsultantData(null);
            }}
            onSuccess={() => {
              Toast.show({ icon: "success", content: "Profile updated successfully!" });
              setConsultantData(null);
              checkRoleFormStatus(profile);
            }}
            onCancel={() => {
              setConsultantData(null);
            }}
          />
        </div>
      )}

      <style jsx>{`
        .profile-container {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          width: 100%;
          padding-bottom: 24px;
        }

        .profile-actions {
          position: absolute;
          top: 0;
          right: 0;
          display: flex;
          gap: 10px;
          padding: 8px;
          background: transparent;
        }

        .icon-btn {
          display: flex;
          justify-content: center;
          align-items: center;
          background: #f5f5f5;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          transition: all 0.2s;
          cursor: pointer;
        }

        .icon-btn:hover {
          background: #e9e9e9;
          transform: scale(1.05);
        }

        .profile-name {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .profile-joined {
          font-size: 13px;
          color: #8c8c8c;
        }

        .loading-profile {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 200px;
        }

        .no-profile {
          text-align: center;
          padding: 60px 0;
          color: #666;
        }
      `}</style>
    </>
  );

  // Helper function to get user role for display - FIXED to handle role array properly
  function getUserRoleDisplay(userData = profile) {
    if (!userData || !userData.role) return "User";
    const roles = Array.isArray(userData.role) ? userData.role : [userData.role];
    return roles[0] ? String(roles[0]).charAt(0).toUpperCase() + String(roles[0]).slice(1) : "User";
  }
}