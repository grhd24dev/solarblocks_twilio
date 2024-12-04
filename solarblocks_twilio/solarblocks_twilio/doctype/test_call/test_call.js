// Copyright (c) 2024, Grhd24dev and contributors
// For license information, please see license.txt
frappe.provide("frappe.phone_call")

frappe.ui.form.on("Test Call", {
  refresh(frm) {
    console.log(frappe.phone_call)
    var script = document.createElement("script");
    document.head.appendChild(script);
    script.src =
      "https://sdk.twilio.com/js/client/releases/1.13.0/twilio.min.js";

    frm.add_custom_button("Call", () => {
      this.twilio_device = null;

      this.dialog = new frappe.ui.Dialog({
        'static': 1,
        'title': __("Make a Call"),
        'size': 'large',
        'minimizable': true,
        'fields': [
          {
            fieldname: "to_number",
            label: "To Number",
            fieldtype: "Data",
            ignore_validation: true,
            default: frm.doc.phone_number,
            read_only: 0,
            reqd: 1,
          },
          {
            fieldname: "note",
            label: "Note",
            fieldtype: "Text",
            ignore_validation: true,
            hidden: 1,
            read_only: 0,
            reqd: 0,
          },
        ],
        primary_action_label: __("Call"),

        primary_action: () => {
          this.dialog.disable_primary_action();
          this.dialog.get_primary_btn().css({
            "pointer-events": "none"
          });

          const me = this;

          startupClient(me, frm.doc.phone_number);

          this.dialog.enable_primary_action();

        },
        // secondary_action_label: __("Disconnect"),
        onhide: () => {
          if (this.twilio_device) {
            this.twilio_device.disconnectAll();
          }
        }
      });
      this.dialog.get_secondary_btn().addClass('hide');

      this.dialog.get_close_btn().show();

    }).css({'background-color':'rgb(191 219 254)'});
  },
});

async function startupClient(dialog, number) {

  try {
    frappe.call({
      method:
        "solarblocks_twilio.integrations.twilio.api.generate_access_token",
      callback: (data) => {
        console.log('dialog', dialog.dialog)
        device = new Twilio.Device(data.message.token, {
          codecPreferences: ["opus", "pcmu"],
          fakeLocalDTMF: true,
          enableRingingState: true,
        });

        device.on('ready', function() {
          const call = device.connect({ To: number })

          dialog.dialog.set_secondary_action(() => call.disconnect())

          call.on('accept', (call) => {
            console.log('accepted call')
            dialog.dialog.set_title("Call In Progress")
            dialog.dialog.get_secondary_btn().removeClass('hide');
            dialog.dialog.set_secondary_action_label("Hang Up")
            dialog.dialog.disable_primary_action()
            dialog.dialog.set_df_property('note', 'hidden', 0)
          })

          call.on('connecting', () => {
            console.log('connecting')
          })

          call.on('pending', () => {
            console.log('pending')
          })

          call.on('ringing', () => {
            console.log('ringing call')
          })

          call.on('cancel', () => {
            console.log('cancelled call')
          })

          call.on('disconnect', (call) => {
            console.log('disconnect call')
            dialog.dialog.set_title("Make a Call")
            dialog.dialog.get_secondary_btn().addClass('hide');
            dialog.dialog.enable_primary_action()
            dialog.dialog.get_primary_btn().css({
              "pointer-events": "auto"
            })
            dialog.dialog.set_df_property('note', 'hidden', 1)
          })
        });

        // or handle an incoming call
        device.on('incoming', ( call ) => {
          console.log(call)
          console.log('incoming')
          dialog.dialog.set_title("Incomming Call")
          dialog.dialog.set_secondary_action(() => call.accept())
          dialog.dialog.set_secondary_action_label("Pick Up")

          call.on('accept', (conn) => {
            console.log('conn', conn)
          })

          // add event listener to call object
          call.on('cancel', handleDisconnectedIncomingCall)
          call.on('disconnect', handleDisconnectedIncomingCall)
          call.on('reject', handleDisconnectedIncomingCall)
        });

        device.on('accept', () => {
          console.log('accepted')
        });

        device.on('connect', function(conn) {
          console.log("Connect", conn)
        });

        device.register()
        console.log('device registered with listeners')

      }
    });
  } catch (err) {
    console.log(err);
  }
}
