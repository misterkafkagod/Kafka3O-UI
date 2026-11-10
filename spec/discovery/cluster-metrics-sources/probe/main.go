// Throwaway discovery probe: read-only metrics reads against one Kafka cluster.
package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/twmb/franz-go/pkg/kadm"
	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/twmb/franz-go/pkg/kmsg"
	"github.com/twmb/franz-go/pkg/sasl/scram"
)

func main() {
	ca, err := os.ReadFile(os.Getenv("PROBE_CA"))
	must(err)
	pool := x509.NewCertPool()
	pool.AppendCertsFromPEM(ca)
	client, err := kgo.NewClient(
		kgo.SeedBrokers(os.Getenv("PROBE_BROKER")),
		kgo.DialTLSConfig(&tls.Config{RootCAs: pool, ServerName: os.Getenv("PROBE_SERVER_NAME"), MinVersion: tls.VersionTLS12}),
		kgo.SASL(scram.Auth{User: os.Getenv("PROBE_USER"), Pass: os.Getenv("PROBE_PASSWORD")}.AsSha512Mechanism()),
	)
	must(err)
	defer client.Close()
	admin := kadm.NewClient(client)
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	start := time.Now()
	dirs, err := admin.DescribeAllLogDirs(ctx, nil)
	must(err)
	fmt.Printf("== DescribeAllLogDirs (%s)\n", time.Since(start).Round(time.Millisecond))
	dirs.Each(func(d kadm.DescribedLogDir) {
		var kafkaBytes int64
		d.Topics.Each(func(p kadm.DescribedLogDirPartition) { kafkaBytes += p.Size })
		fmt.Printf("broker=%d dir=%s err=%v total=%d usable=%d sumPartitionSize=%d partitions=%d\n", d.Broker, d.Dir, d.Err, d.TotalBytes, d.UsableBytes, kafkaBytes, len(d.Topics.Sorted()))
	})

	// Raw response version, to see whether TotalBytes/UsableBytes are reported (v4+).
	req := kmsg.NewPtrDescribeLogDirsRequest()
	resp, err := req.RequestWith(ctx, client)
	must(err)
	fmt.Printf("== raw DescribeLogDirs response version=%d dirs=%d\n", resp.Version, len(resp.Dirs))

	start = time.Now()
	topics, err := admin.ListTopics(ctx)
	must(err)
	fmt.Printf("== Metadata (%s): topics=%d\n", time.Since(start).Round(time.Millisecond), len(topics))
	under, offline := 0, 0
	partitions := 0
	topics.EachPartition(func(p kadm.PartitionDetail) {
		partitions++
		if p.Leader < 0 || p.Err != nil {
			offline++
		}
		if len(p.ISR) < len(p.Replicas) {
			under++
		}
	})
	fmt.Printf("partitions=%d underReplicated=%d offlineOrError=%d\n", partitions, under, offline)

	configs, err := admin.DescribeTopicConfigs(ctx, topics.Names()...)
	must(err)
	for _, c := range configs {
		for _, kv := range c.Configs {
			if kv.Key == "min.insync.replicas" && kv.Value != nil {
				fmt.Printf("topic=%s min.insync.replicas=%s source=%s\n", c.Name, *kv.Value, kv.Source)
			}
		}
	}

	start = time.Now()
	ends, err := admin.ListEndOffsets(ctx, topics.Names()...)
	must(err)
	first := map[string]int64{}
	ends.Each(func(o kadm.ListedOffset) { first[fmt.Sprintf("%s/%d", o.Topic, o.Partition)] = o.Offset })
	fmt.Printf("== ListEndOffsets (%s): %d partitions\n", time.Since(start).Round(time.Millisecond), len(first))
	sample, _ := json.Marshal(first)
	fmt.Printf("%s\n", sample)
}

func must(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
