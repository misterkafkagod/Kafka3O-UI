// Throwaway discovery probe: DescribeQuorum and partition leaders against one Kafka cluster, read-only.
package main

import (
	"context"
	"crypto/tls"
	"crypto/x509"
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
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	start := time.Now()
	req := kmsg.NewPtrDescribeQuorumRequest()
	topic := kmsg.NewDescribeQuorumRequestTopic()
	topic.Topic = "__cluster_metadata"
	partition := kmsg.NewDescribeQuorumRequestTopicPartition()
	topic.Partitions = append(topic.Partitions, partition)
	req.Topics = append(req.Topics, topic)
	resp, err := req.RequestWith(ctx, client)
	if err != nil {
		fmt.Printf("== DescribeQuorum error: %v\n", err)
	} else {
		fmt.Printf("== DescribeQuorum v%d (%s) error=%d\n", resp.Version, time.Since(start).Round(time.Millisecond), resp.ErrorCode)
		for _, t := range resp.Topics {
			for _, p := range t.Partitions {
				fmt.Printf("topic=%s partition=%d error=%d leader=%d epoch=%d hw=%d\n", t.Topic, p.Partition, p.ErrorCode, p.LeaderID, p.LeaderEpoch, p.HighWatermark)
				for _, v := range p.CurrentVoters {
					fmt.Printf("  voter id=%d leo=%d lastFetch=%d lastCaughtUp=%d\n", v.ReplicaID, v.LogEndOffset, v.LastFetchTimestamp, v.LastCaughtUpTimestamp)
				}
				for _, o := range p.Observers {
					fmt.Printf("  observer id=%d leo=%d\n", o.ReplicaID, o.LogEndOffset)
				}
			}
		}
		for _, n := range resp.Nodes {
			fmt.Printf("  node id=%d\n", n.NodeID)
		}
	}

	topics, err := kadm.NewClient(client).ListTopicsWithInternal(ctx)
	must(err)
	leaders, replicas, nonPreferred := map[int32]int{}, map[int32]int{}, map[int32]int{}
	topics.EachPartition(func(p kadm.PartitionDetail) {
		leaders[p.Leader]++
		for _, r := range p.Replicas {
			replicas[r]++
		}
		if len(p.Replicas) > 0 && p.Leader != p.Replicas[0] {
			nonPreferred[p.Leader]++
		}
	})
	fmt.Printf("== leaders=%v replicas=%v nonPreferred=%v\n", leaders, replicas, nonPreferred)
}

func must(err error) {
	if err != nil {
		fmt.Println("error:", err)
		os.Exit(1)
	}
}
