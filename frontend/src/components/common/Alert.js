import React from 'react';

function Alert(props) {
  const capitalize = (word) => {
    if (word === "danger") word = "error";
    const lower = word.toLowerCase();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  return (
    <>
      {props.alert && (
        <div
          className={`alert alert-${props.alert.type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x px-4 py-2 shadow w-50 m-3`}
          role="alert"
          style={{ zIndex: 1050 }}
        >
          <strong>{capitalize(props.alert.type)}</strong>: {props.alert.msg}
        </div>
      )}
    </>
  );
}

export default Alert;

