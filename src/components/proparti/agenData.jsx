import React, { useState, useEffect } from "react";
import {
  Card,
  Grid,
  Tag,
  Button,
  Empty,
  Space,
  Toast,
  Modal,
  TextArea,
  SpinLoading,
} from "antd-mobile";
import {
  EyeOutline,
  EnvironmentOutline,
  CheckCircleOutline,
  CloseCircleOutline,
} from "antd-mobile-icons";
import { useNavigate } from "react-router-dom";
import { getAgents, approveAgent, rejectAgent } from "../../services/agents";
import { getProfile } from "../../services/auth";

const MyAgents = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isMasterAdmin, setIsMasterAdmin] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    type: "",
    agent: null,
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const navigate = useNavigate();

  // ✅ Check if user is master admin
  const checkMasterAdminRole = (userData) => {
    if (!userData) return false;

    console.log("Checking master admin role for:", userData);

    // If userData is an array (multiple users), check each user
    if (Array.isArray(userData)) {
      const hasMasterAdmin = userData.some((u) => {
        const roles = u.role;
        const isAdmin = Array.isArray(roles)
          ? roles.includes("admin") || roles.includes("master-admin")
          : roles === "admin" || roles === "master-admin";
        
        console.log(`User ${u.phone} roles:`, roles, "isAdmin:", isAdmin);
        return isAdmin;
      });
      console.log("Has master admin in array:", hasMasterAdmin);
      return hasMasterAdmin;
    }

    // If single user object
    const roles = userData.role;
    const isAdmin = Array.isArray(roles)
      ? roles.includes("admin") || roles.includes("master-admin")
      : roles === "admin" || roles === "master-admin";
    
    console.log("Single user is admin:", isAdmin);
    return isAdmin;
  };

  // ✅ Fixed fetchData function with proper data extraction
  const fetchData = async () => {
    setLoading(true);
    try {
      const profileRes = await getProfile();
      console.log("Profile response:", profileRes);
      
      if (profileRes?.success) {
        const userData = profileRes.data?.users || profileRes.data?.user || profileRes.data;
        setUser(userData);

        const masterAdminCheck = checkMasterAdminRole(userData);
        console.log("Master Admin Check Result:", masterAdminCheck);
        setIsMasterAdmin(masterAdminCheck);

        if (masterAdminCheck) {
          const agentRes = await getAgents();
          console.log("Agents response:", agentRes);
          console.log("Agents response data structure:", agentRes.data);
          
          // ✅ FIXED: Properly extract agents from nested response
          let agentsData = [];
          
          if (agentRes?.success) {
            // Handle nested response structure: data.data contains the array
            if (agentRes.data?.data && Array.isArray(agentRes.data.data)) {
              agentsData = agentRes.data.data;
              console.log("Found agents in data.data:", agentsData);
            } 
            // Fallback to other possible structures
            else if (Array.isArray(agentRes.data)) {
              agentsData = agentRes.data;
              console.log("Found agents in data:", agentsData);
            }
            else if (Array.isArray(agentRes.agents)) {
              agentsData = agentRes.agents;
              console.log("Found agents in agents:", agentsData);
            }
            else if (Array.isArray(agentRes.result)) {
              agentsData = agentRes.result;
              console.log("Found agents in result:", agentsData);
            }
            
            setAgents(agentsData);
            console.log("Final agents data to set:", agentsData);
          } else {
            console.warn("Agents response not successful:", agentRes);
            Toast.show({ content: "Failed to load agents" });
            setAgents([]);
          }
        } else {
          setAgents([]);
        }
      } else {
        console.warn("Profile response not successful:", profileRes);
        Toast.show({ content: "Failed to load user profile" });
        setIsMasterAdmin(false);
        setAgents([]);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      Toast.show({ content: "Error loading data" });
      setIsMasterAdmin(false);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Debug agents state
  useEffect(() => {
    console.log("Agents state updated:", agents);
    console.log("Agents type:", typeof agents);
    console.log("Is array?", Array.isArray(agents));
    console.log("Agents length:", agents?.length || 0);
  }, [agents]);

  // ✅ Open confirm modal
  const openConfirmModal = (type, agent) => {
    setRejectionReason("");
    setConfirmModal({ visible: true, type, agent });
  };

  // ✅ Handle Approve / Reject
  const handleConfirmAction = async () => {
    const { type, agent } = confirmModal;
    if (!agent) return;

    try {
      setLoading(true);
      let res;

      console.log(`Attempting to ${type} agent:`, agent._id);

      // ✅ Optimistically update UI first
      const updatedAgents = agents.map(a => {
        if (a._id === agent._id) {
          return {
            ...a,
            status: type === "approve" ? "approved" : "rejected",
            rejectedReason: type === "reject" ? rejectionReason : ""
          };
        }
        return a;
      });
      setAgents(updatedAgents);

      if (type === "approve") {
        res = await approveAgent(agent._id);
      } else {
        if (!rejectionReason.trim()) {
          Toast.show({ content: "Please enter rejection reason" });
          // Revert optimistic update if validation fails
          setAgents(agents);
          setLoading(false);
          return;
        }
        res = await rejectAgent(agent._id, { reason: rejectionReason });
      }

      console.log(`${type} response:`, res);

      if (res.success) {
        Toast.show({
          icon: "success",
          content: `Agent ${
            type === "approve" ? "approved" : "rejected"
          } successfully`,
        });
        // Refresh data to ensure consistency
        fetchData();
      } else {
        // Revert optimistic update on failure
        Toast.show({
          icon: "fail",
          content: res.error || res.message || `Failed to ${type} agent`,
        });
        setAgents(agents);
      }
    } catch (err) {
      console.error("Action failed:", err);
      Toast.show({ 
        icon: "fail", 
        content: "Action failed. You may not have sufficient permissions." 
      });
      // Revert optimistic update on error
      setAgents(agents);
    } finally {
      setLoading(false);
      setConfirmModal({ visible: false, type: "", agent: null });
      setRejectionReason("");
    }
  };

  // ✅ Get agent status
  const getAgentStatus = (agent) => {
    // Check status field first (backend uses this)
    if (agent.status === "approved") return "approved";
    if (agent.status === "rejected") return "rejected";
    
    // Fallback to old fields for backward compatibility
    if (agent.isApproved) return "approved";
    if (agent.isRejected) return "rejected";
    
    return "pending";
  };

  // ✅ Safe rendering function for agents
  const renderAgents = () => {
    // ✅ Double safety check before mapping
    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      return <Empty description="No agents found for approval" />;
    }

    return (
      <Grid columns={1} gap={12}>
        {agents.map((agent) => {
          const status = getAgentStatus(agent);
          const showAdminActions = status === "pending"; // Only show actions for pending agents

          return (
            <Grid.Item key={agent._id || agent.id}>
              <Card>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {/* Agent Name + Firm */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "8px",
                    }}
                  >
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
                      {agent.agentName || agent.name || "Unnamed Agent"}
                    </h3>
                    <Tag color="primary" size="small">
                      {agent.firmName || "Independent"}
                    </Tag>
                  </div>

                  {/* Status */}
                  {status === "approved" ? (
                    <Tag color="success" style={{ marginBottom: 8 }}>
                      ✅ Approved
                    </Tag>
                  ) : status === "rejected" ? (
                    <Tag color="danger" style={{ marginBottom: 8 }}>
                      ❌ Rejected
                      {agent.rejectedReason && (
                        <span style={{ marginLeft: "4px", fontSize: "11px" }}>
                          - {agent.rejectedReason}
                        </span>
                      )}
                    </Tag>
                  ) : (
                    <Tag color="warning" style={{ marginBottom: 8 }}>
                      ⏳ Pending Approval
                    </Tag>
                  )}

                  {/* City */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      marginBottom: "6px",
                    }}
                  >
                    <EnvironmentOutline
                      style={{ fontSize: "14px", color: "#666" }}
                    />
                    <span style={{ fontSize: "13px", color: "#666" }}>
                      {agent.operatingCity || agent.city || "N/A"}
                    </span>
                  </div>

                  {/* Details */}
                  <div style={{ marginBottom: "8px" }}>
                    <p style={{ margin: "2px 0", fontSize: "13px" }}>
                      🏢 Firm: <b>{agent.firmName || "Not specified"}</b>
                    </p>
                    <p style={{ margin: "2px 0", fontSize: "13px" }}>
                      🏘 Deals In:{" "}
                      <b>{agent.dealsIn?.join(", ") || "Not specified"}</b>
                    </p>
                    <p style={{ margin: "2px 0", fontSize: "13px" }}>
                      📅 Operating Since: <b>{agent.operatingSince || "N/A"}</b>
                    </p>
                    <p style={{ margin: "2px 0", fontSize: "13px" }}>
                      👥 Team Members: <b>{agent.teamMembers || "N/A"}</b>
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginTop: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      size="mini"
                      color="primary"
                      // onClick={() => navigate(`/agent/${agent._id || agent.id}`)}
                      onClick={() => (`console.log('no path ')`)}
                    >
                      <EyeOutline /> View
                    </Button>

                    {/* Show approve/reject only for pending agents */}
                    {showAdminActions && (
                      <>
                        <Button
                          size="mini"
                          color="success"
                          onClick={() => openConfirmModal("approve", agent)}
                        >
                          <CheckCircleOutline /> Approve
                        </Button>
                        <Button
                          size="mini"
                          color="danger"
                          onClick={() => openConfirmModal("reject", agent)}
                        >
                          <CloseCircleOutline /> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </Grid.Item>
          );
        })}
      </Grid>
    );
  };

  // ✅ Loading state
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "60vh",
        }}
      >
        <SpinLoading color="primary" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", padding: "16px" }}>
      {/* Header */}
      <div style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "600" }}>
          {isMasterAdmin ? "All Agents - Admin Panel" : "My Agents"}
        </h1>
        <p style={{ margin: 0, color: "#666" }}>
          {isMasterAdmin
            ? `Showing ${Array.isArray(agents) ? agents.length : 0} agents for approval`
            : "Access Restricted - Admin Only"}
        </p>
        {isMasterAdmin && (
          <p style={{ margin: "4px 0 0 0", color: "#52c41a", fontSize: "12px" }}>
            ✓ You have master administrator privileges
          </p>
        )}
      </div>

      {/* Only show if master admin */}
      {isMasterAdmin ? (
        renderAgents()
      ) : (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            background: "#fff",
            borderRadius: "8px",
            marginTop: "20px",
          }}
        >
          <Empty description="Access Denied" />
          <p style={{ marginTop: "16px", color: "#666", fontSize: "14px" }}>
            Master administrator privileges required to view this page.
          </p>
          <p style={{ marginTop: "8px", color: "#999", fontSize: "12px" }}>
            Your current role does not have permission to manage agents.
          </p>
          <Button 
            color="primary" 
            style={{ marginTop: "16px" }}
            onClick={() => navigate("/")}
          >
            Go to Homepage
          </Button>
        </div>
      )}

      {/* Modal - Only show for master admin */}
      {isMasterAdmin && (
        <Modal
          visible={confirmModal.visible}
          title={
            confirmModal.type === "approve"
              ? "Approve Agent"
              : "Reject Agent"
          }
          onClose={() => {
            setConfirmModal({ visible: false, type: "", agent: null });
            setRejectionReason("");
          }}
          content={
            <div style={{ textAlign: "center", padding: "20px" }}>
              <p style={{ fontSize: "16px" }}>
                Are you sure you want to{" "}
                <span
                  style={{
                    color:
                      confirmModal.type === "approve" ? "#52c41a" : "#f5222d",
                    fontWeight: "600",
                  }}
                >
                  {confirmModal.type === "approve" ? "approve" : "reject"}
                </span>{" "}
                this agent?
              </p>
              {confirmModal.type === "reject" && (
                <div>
                  <p style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>
                    Please provide a reason for rejection:
                  </p>
                  <TextArea
                    placeholder="Enter rejection reason..."
                    value={rejectionReason}
                    onChange={setRejectionReason}
                    style={{ marginBottom: "16px" }}
                    rows={3}
                  />
                </div>
              )}
              <Space block>
                <Button
                  color="default"
                  onClick={() => {
                    setConfirmModal({ visible: false, type: "", agent: null });
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color={
                    confirmModal.type === "approve" ? "success" : "danger"
                  }
                  onClick={handleConfirmAction}
                  loading={loading}
                >
                  {confirmModal.type === "approve"
                    ? "Yes, Approve"
                    : "Yes, Reject"}
                </Button>
              </Space>
            </div>
          }
        />
      )}
    </div>
  );
};

export default MyAgents;